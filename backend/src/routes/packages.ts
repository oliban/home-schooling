import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { redis, cacheHits, cacheMisses } from '../index.js';
import { authenticateParent } from '../middleware/auth.js';
import { ocrQueue, type OcrJobData } from '../services/ocr-queue.js';
import { invalidateAssignmentsCache } from './assignments.js';
import type { MathPackage, PackageProblem, ImportPackageRequest, BatchImportRequest } from '../types/index.js';

const router = Router();

// Cache TTL for packages list (5 minutes - moderate freshness)
const PACKAGES_CACHE_TTL = 300;

// Cache key generation for packages list
function getPackagesCacheKey(
  parentId: string,
  filters: { grade?: string; category?: string; scope?: string; type?: string }
): string {
  const grade = filters.grade || 'all';
  const category = filters.category || 'all';
  const scope = filters.scope || 'all';
  const type = filters.type || 'all';
  return `packages:parent:${parentId}:grade:${grade}:category:${category}:scope:${scope}:type:${type}`;
}

// Invalidate packages cache for a parent
async function invalidatePackagesCache(parentId: string): Promise<void> {
  try {
    const pattern = `packages:parent:${parentId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    // Log but don't fail the operation if cache invalidation fails
    console.error('Packages cache invalidation error:', err instanceof Error ? err.message : err);
  }
}

// Export for use by other modules that may need to invalidate packages cache
export { invalidatePackagesCache };

/**
 * Extended import request interface that supports optional OCR processing
 * When imagePaths or images are provided, OCR jobs are queued asynchronously
 */
interface OcrImportRequest {
  package?: {
    name: string;
    grade_level: number;
    category_id?: string | null;
    assignment_type?: string;
    description?: string;
    global?: boolean;
  };
  packages?: ImportPackageRequest[];
  problems?: PackageProblem[];
  isGlobal?: boolean;
  // OCR-related fields for async processing
  imagePaths?: string[];
  language?: string;
}

// Import package(s) from JSON - handles both single and batch
// Returns 202 Accepted with job ID when OCR processing is queued
// Returns 201 Created when packages are imported synchronously
router.post('/import', authenticateParent, async (req, res) => {
  try {
    const data: OcrImportRequest = req.body;

    // Check if OCR processing is requested (imagePaths provided)
    // When imagePaths are provided, queue OCR job and return immediately with job ID
    if (data.imagePaths && data.imagePaths.length > 0) {
      const jobData: OcrJobData = {
        type: data.imagePaths.length === 1 ? 'single' : 'batch',
        imagePath: data.imagePaths.length === 1 ? data.imagePaths[0] : undefined,
        imagePaths: data.imagePaths.length > 1 ? data.imagePaths : undefined,
        language: data.language || 'swe',
      };

      const job = await ocrQueue.add('ocr-import', jobData, {
        jobId: uuidv4(), // Use predictable job ID for tracking
      });

      // Return 202 Accepted with job ID for async polling
      return res.status(202).json({
        status: 'queued',
        jobId: job.id,
        message: 'OCR processing queued. Poll /api/packages/jobs/:jobId for status.',
        imagePaths: data.imagePaths,
      });
    }

    // Detect if this is a batch import (has "packages" array) or single import (has "package" object)
    const isBatch = Array.isArray(data.packages);
    const packagesToImport = (isBatch && data.packages
      ? data.packages
      : [{ package: data.package, problems: data.problems, isGlobal: data.isGlobal }]) as ImportPackageRequest[];

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
        if (!p.lgr22_codes || !Array.isArray(p.lgr22_codes) || p.lgr22_codes.length === 0) {
          validationErrors.push(`${pkgNum} (${pkg.name}), Problem ${num}: missing lgr22_codes array. Each problem must have at least one LGR22 curriculum code.`);
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

    // Validate that all LGR22 codes exist in the database
    const allCodes = new Set<string>();
    packagesToImport.forEach(item => {
      item.problems.forEach(p => {
        if (p.lgr22_codes && Array.isArray(p.lgr22_codes)) {
          p.lgr22_codes.forEach(code => allCodes.add(code));
        }
      });
    });

    if (allCodes.size > 0) {
      const placeholders = Array.from(allCodes).map(() => '?').join(',');
      const existingCodes = db.all<{ code: string }>(
        `SELECT code FROM curriculum_objectives WHERE code IN (${placeholders})`,
        Array.from(allCodes)
      );
      const existingCodesSet = new Set(existingCodes.map(c => c.code));
      const invalidCodes = Array.from(allCodes).filter(code => !existingCodesSet.has(code));

      if (invalidCodes.length > 0) {
        return res.status(400).json({
          error: 'Invalid LGR22 codes',
          details: [`The following LGR22 codes do not exist in the database: ${invalidCodes.join(', ')}`]
        });
      }
    }
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
          const problemId = uuidv4();

          db.run(
            `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, explanation, hint, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              problemId,
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

          // Create curriculum mappings if lgr22_codes provided
          if (p.lgr22_codes && Array.isArray(p.lgr22_codes)) {
            for (const code of p.lgr22_codes) {
              const objective = db.get<{ id: number }>(
                'SELECT id FROM curriculum_objectives WHERE code = ?',
                [code]
              );
              if (objective) {
                db.run(
                  `INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
                   VALUES (?, ?, ?)`,
                  ['package_problem', problemId, objective.id]
                );
              }
            }
          }
        }

        results.push({ id: packageId, name: pkg.name, problemCount: problems.length });
      }
    });

    // Invalidate packages cache for this parent (new packages added)
    await invalidatePackagesCache(req.user!.id);

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
// Optimized with Redis caching and prepared statements
router.get('/', authenticateParent, async (req, res) => {
  try {
    const { grade, category, scope, type } = req.query;
    const parentId = req.user!.id;

    // Generate cache key based on parent and filters
    const cacheKey = getPackagesCacheKey(parentId, {
      grade: grade as string,
      category: category as string,
      scope: scope as string,
      type: type as string
    });

    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cacheHits.inc({ cache_type: 'packages' });
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      // Log cache error but continue to database
      console.error('Packages cache read error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    // Cache miss - fetch from database
    cacheMisses.inc({ cache_type: 'packages' });

    const db = getDb();

    // Get all children for this parent (uses prepared statement internally via db.all)
    const allChildren = db.all<{ id: string; name: string; grade_level: number }>(
      'SELECT id, name, grade_level FROM children WHERE parent_id = ?',
      [parentId]
    );
    const childGrades = [...new Set(allChildren.map(c => c.grade_level))];

    // Build dynamic query for packages
    // Note: Dynamic queries with varying placeholders can't be prepared at module level
    // but better-sqlite3's db.all() still compiles efficiently
    let query = `
      SELECT p.*, c.name_sv as category_name
      FROM math_packages p
      LEFT JOIN math_categories c ON p.category_id = c.id
      WHERE p.is_active = 1
        AND (p.parent_id = ? OR (p.is_global = 1 AND p.grade_level IN (${childGrades.map(() => '?').join(',') || 'NULL'})))
    `;
    const params: unknown[] = [parentId, ...childGrades];

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
    // Only fetch if there are packages to look up
    let assignments: { package_id: string; child_id: string; status: string; child_name: string }[] = [];
    if (packages.length > 0) {
      const assignmentStatusQuery = `
        SELECT a.package_id, a.child_id, a.status, c.name as child_name
        FROM assignments a
        JOIN children c ON a.child_id = c.id
        WHERE a.package_id IN (${packages.map(() => '?').join(',')})
          AND a.parent_id = ?
      `;
      const assignmentParams = [...packages.map(p => p.id), parentId];
      assignments = db.all<{ package_id: string; child_id: string; status: string; child_name: string }>(
        assignmentStatusQuery,
        assignmentParams
      );
    }

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
      isOwner: pkg.parent_id === parentId,
      childAssignments: assignmentsByPackage[pkg.id] || []
    }));

    // Store in cache
    try {
      await redis.setex(cacheKey, PACKAGES_CACHE_TTL, JSON.stringify(result));
    } catch (cacheErr) {
      // Log cache write error but don't fail the request
      console.error('Packages cache write error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

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
router.post('/:id/assign', authenticateParent, async (req, res) => {
  try {
    const { childId, title, hintsAllowed = true } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const db = getDb();
    const parentId = req.user!.id;

    // Verify child belongs to parent
    const child = db.get<{ id: string; grade_level: number }>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, parentId]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get children's grades for visibility check
    const children = db.all<{ grade_level: number }>(
      'SELECT DISTINCT grade_level FROM children WHERE parent_id = ?',
      [parentId]
    );
    const childGrades = children.map(c => c.grade_level);

    // Verify package exists and is accessible
    const pkg = db.get<MathPackage>(
      `SELECT * FROM math_packages
       WHERE id = ? AND is_active = 1
         AND (parent_id = ? OR (is_global = 1 AND grade_level IN (${childGrades.map(() => '?').join(',')})))`,
      [req.params.id, parentId, ...childGrades]
    );

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const assignmentId = uuidv4();

    db.run(
      `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [assignmentId, parentId, childId, pkg.assignment_type || 'math', title || pkg.name, pkg.grade_level, req.params.id, hintsAllowed ? 1 : 0]
    );

    // Invalidate packages cache (assignment status changed for this package)
    await invalidatePackagesCache(parentId);

    // Invalidate assignments cache for both parent and child (new assignment affects both views)
    await invalidateAssignmentsCache(parentId, childId);

    res.status(201).json({ id: assignmentId });
  } catch (error) {
    console.error('Assign package error:', error);
    res.status(500).json({ error: 'Failed to assign package' });
  }
});

// Get OCR job status (for polling async OCR processing)
// Returns job state, progress, and result when completed
router.get('/jobs/:jobId', authenticateParent, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await ocrQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    // Build response based on job state
    const response: {
      jobId: string;
      status: string;
      progress?: number | string | object;
      result?: unknown;
      error?: string;
      failedReason?: string;
    } = {
      jobId: jobId,
      status: state,
    };

    // Include progress if available (can be number, string, or object)
    if (progress !== undefined && progress !== null) {
      response.progress = progress as number | string | object;
    }

    // Include result if job completed successfully
    if (state === 'completed') {
      response.result = job.returnvalue;
    }

    // Include error details if job failed
    if (state === 'failed') {
      response.failedReason = job.failedReason || 'Unknown error';
    }

    res.json(response);
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Delete package (owner only) - cascades to assignments
router.delete('/:id', authenticateParent, async (req, res) => {
  try {
    const db = getDb();
    const packageId = req.params.id;
    const parentId = req.user!.id;

    // Verify ownership first
    const pkg = db.get<{ id: string }>(
      'SELECT id FROM math_packages WHERE id = ? AND parent_id = ? AND is_active = 1',
      [packageId, parentId]
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

    // Invalidate packages cache (package deleted)
    await invalidatePackagesCache(parentId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
