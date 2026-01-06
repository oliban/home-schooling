import { Router } from 'express';
import { getDb } from '../data/database.js';
import { redis, cacheHits, cacheMisses } from '../index.js';
import { authenticateParent } from '../middleware/auth.js';
import type { Child } from '../types/index.js';

const router = Router();

// Cache TTL in seconds
const CURRICULUM_CACHE_TTL = 300; // 5 minutes

// Cache key generators for curriculum endpoints
function getCoverageCacheKey(childId: string): string {
  return `curriculum:coverage:${childId}`;
}

// Invalidate all curriculum caches for a child
export async function invalidateCurriculumCache(childId: string): Promise<void> {
  try {
    const keys = [
      getCoverageCacheKey(childId)
    ];
    await redis.del(...keys);
  } catch (err) {
    // Log but don't fail the operation if cache invalidation fails
    console.error('Curriculum cache invalidation error:', err instanceof Error ? err.message : err);
  }
}

// Calculate priority score for an objective based on practice data
// Higher score = higher priority for practice
// Exported so adventures.ts can use the same logic
export function scoreObjective(correctCount: number, totalCount: number): number {
  const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  // Priority 1: Never practiced = highest urgency
  if (totalCount === 0) {
    return 1000;
  }
  // Priority 2: Very few attempts (< 5) = always high priority
  // Sample size too small to trust accuracy
  if (totalCount < 5) {
    return 800 + (5 - totalCount) * 40; // 800-960
  }
  // Priority 3: Low practice count (5-14 attempts)
  if (totalCount < 15) {
    let score = 400 + (15 - totalCount) * 20; // 400-600
    // Reduce priority for high-performing students (> 85% accuracy)
    if (percentage > 85) {
      score -= 100 + (percentage - 85);
    }
    return score;
  }
  // Priority 4: Many attempts but struggling (< 70% accuracy)
  if (percentage < 70) {
    return (70 - percentage) * 3; // 0-210
  }
  // Priority 5: Room for improvement (70-85%)
  if (percentage < 85) {
    return 50;
  }
  // Priority 6: Well-mastered (>= 85% with 15+ attempts)
  return 0;
}

// Types for curriculum data
interface CurriculumObjective {
  id: number;
  category_id: string;
  code: string;
  description: string;
  grade_levels: string;
  extended_description: string | null;
  requires_work_shown: number;
  example_problems: string | null;
  key_concepts: string | null;
  created_at: string;
}

interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  totalObjectives: number;
  coveredObjectives: number;
  totalCorrect: number;
  totalQuestions: number;
  coveragePercentage: number;
  objectives: ObjectiveCoverage[];
}

interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  extendedDescription: string | null;
  requiresWorkShown: boolean;
  exampleProblems: string[] | null;
  keyConcepts: string[] | null;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  score: number;
}

// GET /curriculum/coverage/:childId - Calculate curriculum coverage for a child
router.get('/coverage/:childId', authenticateParent, async (req, res) => {
  try {
    const db = getDb();
    const childId = req.params.childId;

    // Verify child belongs to parent
    const child = db.get<Child>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Try to get from cache first
    const cacheKey = getCoverageCacheKey(childId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cacheHits.inc({ cache_type: 'curriculum_coverage' });
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      // Log cache error but continue to database
      console.error('Cache read error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    // Cache miss - fetch from database
    cacheMisses.inc({ cache_type: 'curriculum_coverage' });

    // Get all curriculum objectives for the child's grade level
    // grade_levels is stored as JSON array like '["1", "2", "3"]'
    const objectives = db.all<CurriculumObjective & { category_name_sv: string }>(
      `SELECT co.*, mc.name_sv as category_name_sv
       FROM curriculum_objectives co
       JOIN math_categories mc ON co.category_id = mc.id
       WHERE co.grade_levels LIKE ?
       ORDER BY mc.name_sv, co.code`,
      [`%"${child.grade_level}"%`]
    );

    // Get completed objectives for this child (from completed assignments only)
    // An objective is covered if the child has completed an assignment with an exercise
    // that is mapped to that objective
    const completedObjectives = db.all<{ objective_id: number; completed_at: string }>(
      `SELECT DISTINCT ccp.objective_id, ccp.completed_at
       FROM child_curriculum_progress ccp
       WHERE ccp.child_id = ?`,
      [childId]
    );

    // Also check if objectives are covered via exercise-curriculum mapping
    // for completed assignments (dynamically calculated)
    // Count correct answers (without hints) and total attempts per objective
    const coveredViaExercises = db.all<{ objective_id: number; completed_at: string; correct_count: number; total_count: number }>(
      `SELECT ecm.objective_id,
              MAX(a.completed_at) as completed_at,
              COUNT(DISTINCT CASE
                WHEN aa.id IS NOT NULL AND aa.is_correct = 1 AND COALESCE(aa.hint_purchased, 0) = 0 THEN aa.id
                WHEN mp.id IS NOT NULL AND mp.is_correct = 1 AND COALESCE(mp.hint_purchased, 0) = 0 THEN mp.id
                WHEN rq.id IS NOT NULL AND rq.is_correct = 1 THEN rq.id
              END) as correct_count,
              COUNT(DISTINCT CASE
                WHEN aa.id IS NOT NULL THEN aa.id
                WHEN mp.id IS NOT NULL THEN mp.id
                WHEN rq.id IS NOT NULL THEN rq.id
              END) as total_count
       FROM exercise_curriculum_mapping ecm
       JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
       LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id
         AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
       LEFT JOIN math_problems mp ON mp.assignment_id = a.id
         AND ecm.exercise_type = 'math_problem' AND ecm.exercise_id = mp.id
       LEFT JOIN reading_questions rq ON rq.assignment_id = a.id
         AND ecm.exercise_type = 'reading_question' AND ecm.exercise_id = rq.id
       WHERE (aa.id IS NOT NULL OR mp.id IS NOT NULL OR rq.id IS NOT NULL)
       GROUP BY ecm.objective_id`,
      [childId]
    );

    // Build a set of covered objective IDs with completion dates and counts
    const coveredObjectiveMap = new Map<number, { completedAt: string; correctCount: number; totalCount: number }>();
    for (const obj of completedObjectives) {
      coveredObjectiveMap.set(obj.objective_id, { completedAt: obj.completed_at, correctCount: 1, totalCount: 1 });
    }
    for (const obj of coveredViaExercises) {
      const existing = coveredObjectiveMap.get(obj.objective_id);
      if (!existing) {
        coveredObjectiveMap.set(obj.objective_id, {
          completedAt: obj.completed_at,
          correctCount: obj.correct_count,
          totalCount: obj.total_count
        });
      } else {
        // Merge: take latest date and add counts
        coveredObjectiveMap.set(obj.objective_id, {
          completedAt: obj.completed_at && obj.completed_at > existing.completedAt
            ? obj.completed_at
            : existing.completedAt,
          correctCount: existing.correctCount + obj.correct_count,
          totalCount: existing.totalCount + obj.total_count
        });
      }
    }

    // Group objectives by category
    const categoryMap = new Map<string, CategoryCoverage>();

    for (const obj of objectives) {
      if (!categoryMap.has(obj.category_id)) {
        categoryMap.set(obj.category_id, {
          categoryId: obj.category_id,
          categoryName: obj.category_name_sv,
          totalObjectives: 0,
          coveredObjectives: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          coveragePercentage: 0,
          objectives: []
        });
      }

      const category = categoryMap.get(obj.category_id)!;
      const coverageData = coveredObjectiveMap.get(obj.id);
      const isCovered = !!coverageData && coverageData.correctCount > 0;
      const correctCount = coverageData?.correctCount || 0;
      const totalCount = coverageData?.totalCount || 0;
      const completedAt = coverageData?.completedAt || null;

      category.totalObjectives++;
      if (isCovered) {
        category.coveredObjectives++;
      }
      category.totalCorrect += correctCount;
      category.totalQuestions += totalCount;

      // Parse JSON fields
      let exampleProblems: string[] | null = null;
      let keyConcepts: string[] | null = null;
      try {
        if (obj.example_problems) exampleProblems = JSON.parse(obj.example_problems);
        if (obj.key_concepts) keyConcepts = JSON.parse(obj.key_concepts);
      } catch {
        // Keep null if JSON parsing fails
      }

      category.objectives.push({
        id: obj.id,
        code: obj.code,
        description: obj.description,
        extendedDescription: obj.extended_description,
        requiresWorkShown: obj.requires_work_shown === 1,
        exampleProblems,
        keyConcepts,
        isCovered,
        correctCount,
        totalCount,
        completedAt,
        score: scoreObjective(correctCount, totalCount)
      });
    }

    // Calculate percentages and convert to array
    const categories: CategoryCoverage[] = [];
    let totalObjectives = 0;
    let totalCovered = 0;
    let grandTotalCorrect = 0;
    let grandTotalQuestions = 0;

    for (const category of categoryMap.values()) {
      // Calculate percentage based on actual success rate (correct/total questions)
      category.coveragePercentage = category.totalQuestions > 0
        ? Math.round((category.totalCorrect / category.totalQuestions) * 100)
        : 0;
      categories.push(category);
      totalObjectives += category.totalObjectives;
      totalCovered += category.coveredObjectives;
      grandTotalCorrect += category.totalCorrect;
      grandTotalQuestions += category.totalQuestions;
    }

    // Sort categories alphabetically by name
    categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'sv'));

    const response = {
      childId,
      childGradeLevel: child.grade_level,
      categories,
      totalObjectives,
      coveredObjectives: totalCovered,
      totalCorrect: grandTotalCorrect,
      totalQuestions: grandTotalQuestions,
      coveragePercentage: grandTotalQuestions > 0
        ? Math.round((grandTotalCorrect / grandTotalQuestions) * 100)
        : 0
    };

    // Store in cache
    try {
      await redis.setex(cacheKey, CURRICULUM_CACHE_TTL, JSON.stringify(response));
    } catch (cacheErr) {
      // Log cache write error but don't fail the request
      console.error('Cache write error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    res.json(response);
  } catch (error) {
    console.error('Get curriculum coverage error:', error);
    res.status(500).json({ error: 'Failed to get curriculum coverage' });
  }
});

// GET /curriculum/matching-packages/:childId - Get packages that match specific objectives
// Query param: objectiveIds (comma-separated list of objective IDs)
router.get('/matching-packages/:childId', authenticateParent, async (req, res) => {
  try {
    const db = getDb();
    const childId = req.params.childId;
    const objectiveIdsParam = req.query.objectiveIds as string;

    if (!objectiveIdsParam) {
      return res.status(400).json({ error: 'objectiveIds query parameter is required' });
    }

    // Parse objective IDs
    const objectiveIds = objectiveIdsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (objectiveIds.length === 0) {
      return res.json({ packages: [] });
    }

    // Verify child belongs to parent
    const child = db.get<Child>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Query packages that have problems mapped to the specified objectives
    // Filter by child's grade, visibility (own packages + global), and not already assigned to child
    const placeholders = objectiveIds.map(() => '?').join(',');
    const packages = db.all<{
      id: string;
      name: string;
      grade_level: number;
      problem_count: number;
      assignment_type: string;
      description: string | null;
      is_global: number;
    }>(
      `SELECT DISTINCT mp.id, mp.name, mp.grade_level, mp.problem_count, mp.assignment_type, mp.description, mp.is_global
       FROM math_packages mp
       JOIN package_problems pp ON pp.package_id = mp.id
       JOIN exercise_curriculum_mapping ecm ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
       WHERE mp.is_active = 1
         AND mp.grade_level = ?
         AND (mp.parent_id = ? OR mp.is_global = 1)
         AND ecm.objective_id IN (${placeholders})
         AND NOT EXISTS (
           SELECT 1 FROM assignments a
           WHERE a.package_id = mp.id AND a.child_id = ?
         )
       ORDER BY mp.name`,
      [child.grade_level, req.user!.id, ...objectiveIds, childId]
    );

    // For each package, get the matching objective codes
    const packageIds = packages.map(p => p.id);
    const matchingObjectivesByPackage = new Map<string, string[]>();

    if (packageIds.length > 0) {
      const pkgPlaceholders = packageIds.map(() => '?').join(',');
      const objMatches = db.all<{ package_id: string; code: string }>(
        `SELECT DISTINCT pp.package_id, co.code
         FROM package_problems pp
         JOIN exercise_curriculum_mapping ecm ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
         JOIN curriculum_objectives co ON ecm.objective_id = co.id
         WHERE pp.package_id IN (${pkgPlaceholders})
           AND ecm.objective_id IN (${placeholders})
         ORDER BY pp.package_id, co.code`,
        [...packageIds, ...objectiveIds]
      );

      for (const match of objMatches) {
        if (!matchingObjectivesByPackage.has(match.package_id)) {
          matchingObjectivesByPackage.set(match.package_id, []);
        }
        matchingObjectivesByPackage.get(match.package_id)!.push(match.code);
      }
    }

    // Build response (all returned packages are available - not yet assigned to this child)
    const result = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      gradeLevel: pkg.grade_level,
      problemCount: pkg.problem_count,
      assignmentType: pkg.assignment_type,
      description: pkg.description,
      isGlobal: pkg.is_global === 1,
      matchingObjectives: matchingObjectivesByPackage.get(pkg.id) || [],
    }));

    res.json({ packages: result });
  } catch (error) {
    console.error('Get matching packages error:', error);
    res.status(500).json({ error: 'Failed to get matching packages' });
  }
});

export default router;