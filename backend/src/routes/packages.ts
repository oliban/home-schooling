import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { authenticateParent } from '../middleware/auth.js';
import type { MathPackage, PackageProblem, ImportPackageRequest } from '../types/index.js';

const router = Router();

// Import package from JSON
router.post('/import', authenticateParent, (req, res) => {
  try {
    const data = req.body as ImportPackageRequest;
    const { package: pkg, problems, isGlobal } = data;

    if (!pkg || !pkg.name || !pkg.grade_level || !problems || !Array.isArray(problems)) {
      return res.status(400).json({ error: 'Invalid package format. Required: package.name, package.grade_level, problems array' });
    }

    if (problems.length === 0) {
      return res.status(400).json({ error: 'Package must contain at least one problem' });
    }

    const db = getDb();
    const packageId = uuidv4();

    // Calculate difficulty summary
    const difficultySummary = problems.reduce((acc, p) => {
      const d = p.difficulty || 'medium';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Determine global flag: explicit isGlobal parameter takes precedence, then pkg.global
    const globalFlag = isGlobal !== undefined ? isGlobal : (pkg.global ?? false);

    db.transaction(() => {
      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, problem_count, difficulty_summary, description, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          packageId,
          req.user!.id,
          pkg.name,
          pkg.grade_level,
          pkg.category_id || null,
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
    });

    res.status(201).json({ id: packageId, problemCount: problems.length });
  } catch (error) {
    console.error('Import package error:', error);
    res.status(500).json({ error: 'Failed to import package' });
  }
});

// List packages (own packages + global packages for children's grades)
router.get('/', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const { grade, category } = req.query;

    // Get grades of parent's children
    const children = db.all<{ grade_level: number }>(
      'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
      [req.user!.id]
    );
    const childGrades = children.map(c => c.grade_level);

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

    query += ' ORDER BY p.grade_level, p.created_at DESC';

    const packages = db.all<MathPackage & { category_name: string | null }>(query, params);

    // Add isOwner flag to each package
    const result = packages.map(pkg => ({
      ...pkg,
      isOwner: pkg.parent_id === req.user!.id
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
    const { childId, title } = req.body;

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
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id)
       VALUES (?, ?, ?, 'math', ?, ?, 'pending', ?)`,
      [assignmentId, req.user!.id, childId, title || pkg.name, pkg.grade_level, req.params.id]
    );

    res.status(201).json({ id: assignmentId });
  } catch (error) {
    console.error('Assign package error:', error);
    res.status(500).json({ error: 'Failed to assign package' });
  }
});

// Soft-delete package (owner only)
router.delete('/:id', authenticateParent, (req, res) => {
  try {
    const db = getDb();

    const result = db.run(
      'UPDATE math_packages SET is_active = 0 WHERE id = ? AND parent_id = ?',
      [req.params.id, req.user!.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Package not found or not owned by you' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
