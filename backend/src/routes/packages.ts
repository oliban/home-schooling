import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { authenticateParent } from '../middleware/auth.js';
import type { MathPackage, PackageProblem, ImportPackageRequest, BatchImportRequest } from '../types/index.js';

const router = Router();

// Import package(s) from JSON - handles both single and batch
router.post('/import', authenticateParent, (req, res) => {
  try {
    const data = req.body;

    // Detect if this is a batch import (has "packages" array) or single import (has "package" object)
    const isBatch = Array.isArray(data.packages);
    const packagesToImport: ImportPackageRequest[] = isBatch
      ? data.packages
      : [{ package: data.package, problems: data.problems, isGlobal: data.isGlobal }];

    if (packagesToImport.length === 0) {
      return res.status(400).json({ error: 'No packages to import' });
    }

    // Validate all packages
    const validationErrors: string[] = [];
    packagesToImport.forEach((item, pkgIndex) => {
      const { package: pkg, problems } = item;
      const pkgNum = isBatch ? `Package ${pkgIndex + 1}` : 'Package';

      if (!pkg || !pkg.name || !pkg.grade_level) {
        validationErrors.push(`${pkgNum}: missing package.name or package.grade_level`);
        return;
      }
      if (!problems || !Array.isArray(problems) || problems.length === 0) {
        validationErrors.push(`${pkgNum} (${pkg.name}): missing or empty problems array`);
        return;
      }

      problems.forEach((p, i) => {
        const num = i + 1;
        if (!p.question_text || typeof p.question_text !== 'string' || !p.question_text.trim()) {
          validationErrors.push(`${pkgNum} (${pkg.name}), Problem ${num}: missing question_text`);
        }
        if (!p.correct_answer || typeof p.correct_answer !== 'string' || !p.correct_answer.trim()) {
          validationErrors.push(`${pkgNum} (${pkg.name}), Problem ${num}: missing correct_answer`);
        }
        if (p.answer_type === 'multiple_choice') {
          if (!p.options || !Array.isArray(p.options) || p.options.length < 2) {
            validationErrors.push(`${pkgNum} (${pkg.name}), Problem ${num}: multiple_choice requires options array`);
          } else {
            // Validate that correct_answer matches one of the options
            const correctAnswer = p.correct_answer.trim().toUpperCase();
            const optionLetters = p.options.map((opt: string) => opt.charAt(0).toUpperCase());

            if (!optionLetters.includes(correctAnswer)) {
              validationErrors.push(
                `${pkgNum} (${pkg.name}), Problem ${num}: correct_answer "${p.correct_answer}" does not match any option (available: ${optionLetters.join(', ')}). ` +
                `correct_answer must be just the letter (e.g., "A", "B", "C", "D")`
              );
            }
          }
        }
      });
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const db = getDb();
    const results: { id: string; name: string; problemCount: number }[] = [];

    db.transaction(() => {
      for (const item of packagesToImport) {
        const { package: pkg, problems, isGlobal } = item;
        const packageId = uuidv4();

        const difficultySummary = problems.reduce((acc, p) => {
          const d = p.difficulty || 'medium';
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const globalFlag = isGlobal !== undefined ? isGlobal : (pkg.global ?? false);
        const assignmentType = pkg.assignment_type || (pkg.category_id === null && problems.every(p => p.answer_type === 'multiple_choice') ? 'reading' : 'math');

        db.run(
          `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, assignment_type, problem_count, difficulty_summary, description, is_global)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            packageId,
            req.user!.id,
            pkg.name,
            pkg.grade_level,
            pkg.category_id || null,
            assignmentType,
            problems.length,
            JSON.stringify(difficultySummary),
            pkg.description || null,
            globalFlag ? 1 : 0
          ]
        );

        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          db.run(
            `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, explanation, hint, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              packageId,
              i + 1,
              p.question_text,
              p.correct_answer,
              p.answer_type || 'number',
              p.options ? JSON.stringify(p.options) : null,
              p.explanation || null,
              p.hint || null,
              p.difficulty || 'medium'
            ]
          );
        }

        results.push({ id: packageId, name: pkg.name, problemCount: problems.length });
      }
    });

    // Return format depends on single vs batch
    if (isBatch) {
      res.status(201).json({ imported: results.length, packages: results });
    } else {
      res.status(201).json({ id: results[0].id, problemCount: results[0].problemCount });
    }
  } catch (error) {
    console.error('Import package error:', error);
    res.status(500).json({ error: 'Failed to import package(s)' });
  }
});

// List packages (own packages + global packages for children's grades)
router.get('/', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const { grade, category, scope, type } = req.query;

    // Get all children for this parent
    const allChildren = db.all<{ id: string; name: string; grade_level: number }>(
      'SELECT id, name, grade_level FROM children WHERE parent_id = ?',
      [req.user!.id]
    );
    const childGrades = [...new Set(allChildren.map(c => c.grade_level))];

    let query = `
      SELECT p.*, c.name_sv as category_name
      FROM math_packages p
      LEFT JOIN math_categories c ON p.category_id = c.id
      WHERE p.is_active = 1
        AND (p.parent_id = ? OR (p.is_global = 1 AND p.grade_level IN (${childGrades.map(() => '?').join(',')})))
    `;
    const params: unknown[] = [req.user!.id, ...childGrades];

    if (grade) {
      query += ' AND p.grade_level = ?';
      params.push(Number(grade));
    }
    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }
    if (scope === 'private') {
      query += ' AND p.is_global = 0';
    } else if (scope === 'global') {
      query += ' AND p.is_global = 1';
    }
    if (type === 'math' || type === 'reading') {
      query += ' AND p.assignment_type = ?';
      params.push(type);
    }

    query += ' ORDER BY p.grade_level, p.created_at DESC';

    const packages = db.all<MathPackage & { category_name: string | null }>(query, params);

    // Get assignment status for each package per child
    const assignmentStatusQuery = `
      SELECT a.package_id, a.child_id, a.status, c.name as child_name
      FROM assignments a
      JOIN children c ON a.child_id = c.id
      WHERE a.package_id IN (${packages.map(() => '?').join(',') || "''"})
        AND a.parent_id = ?
    `;
    const assignmentParams = [...packages.map(p => p.id), req.user!.id];

    const assignments = packages.length > 0
      ? db.all<{ package_id: string; child_id: string; status: string; child_name: string }>(
          assignmentStatusQuery,
          assignmentParams
        )
      : [];

    // Group assignments by package_id
    const assignmentsByPackage = assignments.reduce((acc, a) => {
      if (!acc[a.package_id]) acc[a.package_id] = [];
      acc[a.package_id].push({
        childId: a.child_id,
        childName: a.child_name,
        status: a.status
      });
      return acc;
    }, {} as Record<string, Array<{ childId: string; childName: string; status: string }>>);

    // Add isOwner flag and assignment stats to each package
    const result = packages.map(pkg => ({
      ...pkg,
      isOwner: pkg.parent_id === req.user!.id,
      childAssignments: assignmentsByPackage[pkg.id] || []
    }));

    res.json(result);
  } catch (error) {
    console.error('List packages error:', error);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

// Get package with all problems (for preview)
router.get('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();

    // Get children's grades for visibility check
    const children = db.all<{ grade_level: number }>(
      'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
      [req.user!.id]
    );
    const childGrades = children.map(c => c.grade_level);

    const pkg = db.get<MathPackage & { category_name: string | null }>(
      `SELECT p.*, c.name_sv as category_name
       FROM math_packages p
       LEFT JOIN math_categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_active = 1
         AND (p.parent_id = ? OR (p.is_global = 1 AND p.grade_level IN (${childGrades.map(() => '?').join(',')})))`,
      [req.params.id, req.user!.id, ...childGrades]
    );

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const problems = db.all<PackageProblem>(
      'SELECT * FROM package_problems WHERE package_id = ? ORDER BY problem_number',
      [req.params.id]
    );

    res.json({
      ...pkg,
      isOwner: pkg.parent_id === req.user!.id,
      problems
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Failed to get package' });
  }
});

// Assign package to child (creates assignment)
router.post('/:id/assign', authenticateParent, (req, res) => {
  try {
    const { childId, title, hintsAllowed = true } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const db = getDb();

    // Verify child belongs to parent
    const child = db.get<{ id: string; grade_level: number }>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get children's grades for visibility check
    const children = db.all<{ grade_level: number }>(
      'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
      [req.user!.id]
    );
    const childGrades = children.map(c => c.grade_level);

    // Verify package exists and is accessible
    const pkg = db.get<MathPackage>(
      `SELECT * FROM math_packages
       WHERE id = ? AND is_active = 1
         AND (parent_id = ? OR (is_global = 1 AND grade_level IN (${childGrades.map(() => '?').join(',')})))`,
      [req.params.id, req.user!.id, ...childGrades]
    );

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const assignmentId = uuidv4();

    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [assignmentId, req.user!.id, childId, pkg.assignment_type || 'math', title || pkg.name, pkg.grade_level, req.params.id, hintsAllowed ? 1 : 0]
    );

    res.status(201).json({ id: assignmentId });
  } catch (error) {
    console.error('Assign package error:', error);
    res.status(500).json({ error: 'Failed to assign package' });
  }
});

// Delete package (owner only) - cascades to assignments
router.delete('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const packageId = req.params.id;

    // Verify ownership first
    const pkg = db.get<{ id: string }>(
      'SELECT id FROM math_packages WHERE id = ? AND parent_id = ? AND is_active = 1',
      [packageId, req.user!.id]
    );

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found or not owned by you' });
    }

    // Cascade delete in transaction
    db.transaction(() => {
      // Delete assignment answers for assignments linked to this package
      db.run(
        `DELETE FROM assignment_answers
         WHERE assignment_id IN (SELECT id FROM assignments WHERE package_id = ?)`,
        [packageId]
      );

      // Delete assignments linked to this package
      db.run('DELETE FROM assignments WHERE package_id = ?', [packageId]);

      // Soft-delete the package
      db.run('UPDATE math_packages SET is_active = 0 WHERE id = ?', [packageId]);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
