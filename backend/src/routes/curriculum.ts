import { Router } from 'express';
import { getDb } from '../data/database.js';
import { authenticateParent } from '../middleware/auth.js';
import type { Child } from '../types/index.js';

const router = Router();

// Types for curriculum data
interface CurriculumObjective {
  id: number;
  category_id: string;
  code: string;
  description: string;
  grade_levels: string;
  created_at: string;
}

interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  totalObjectives: number;
  coveredObjectives: number;
  coveragePercentage: number;
  objectives: ObjectiveCoverage[];
}

interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  isCovered: boolean;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
}

interface CurriculumGap {
  id: number;
  code: string;
  description: string;
  categoryId: string;
  categoryName: string;
}

// GET /curriculum/coverage/:childId - Calculate curriculum coverage for a child
router.get('/coverage/:childId', authenticateParent, (req, res) => {
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

      category.objectives.push({
        id: obj.id,
        code: obj.code,
        description: obj.description,
        isCovered,
        correctCount,
        totalCount,
        completedAt
      });
    }

    // Calculate percentages and convert to array
    const categories: CategoryCoverage[] = [];
    let totalObjectives = 0;
    let totalCovered = 0;

    for (const category of categoryMap.values()) {
      category.coveragePercentage = category.totalObjectives > 0
        ? Math.round((category.coveredObjectives / category.totalObjectives) * 100)
        : 0;
      categories.push(category);
      totalObjectives += category.totalObjectives;
      totalCovered += category.coveredObjectives;
    }

    // Sort categories alphabetically by name
    categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'sv'));

    res.json({
      childId,
      childGradeLevel: child.grade_level,
      categories,
      totalObjectives,
      coveredObjectives: totalCovered,
      coveragePercentage: totalObjectives > 0
        ? Math.round((totalCovered / totalObjectives) * 100)
        : 0
    });
  } catch (error) {
    console.error('Get curriculum coverage error:', error);
    res.status(500).json({ error: 'Failed to get curriculum coverage' });
  }
});

// GET /curriculum/gaps/:childId - Get uncovered curriculum objectives (gaps) for a child
router.get('/gaps/:childId', authenticateParent, (req, res) => {
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

    // Get all curriculum objectives for the child's grade level
    const objectives = db.all<CurriculumObjective & { category_name_sv: string }>(
      `SELECT co.*, mc.name_sv as category_name_sv
       FROM curriculum_objectives co
       JOIN math_categories mc ON co.category_id = mc.id
       WHERE co.grade_levels LIKE ?
       ORDER BY mc.name_sv, co.code`,
      [`%"${child.grade_level}"%`]
    );

    // Get completed objectives for this child (from child_curriculum_progress)
    const completedObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ccp.objective_id
       FROM child_curriculum_progress ccp
       WHERE ccp.child_id = ?`,
      [childId]
    );

    // Also check objectives covered via exercise-curriculum mapping for completed assignments
    // Exclude answers where a hint was purchased
    const coveredViaExercises = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ecm.objective_id
       FROM exercise_curriculum_mapping ecm
       JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
       LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
         AND COALESCE(aa.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
       LEFT JOIN math_problems mp ON mp.assignment_id = a.id AND mp.is_correct = 1
         AND COALESCE(mp.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'math_problem' AND ecm.exercise_id = mp.id
       LEFT JOIN reading_questions rq ON rq.assignment_id = a.id AND rq.is_correct = 1
         AND ecm.exercise_type = 'reading_question' AND ecm.exercise_id = rq.id
       WHERE (aa.id IS NOT NULL OR mp.id IS NOT NULL OR rq.id IS NOT NULL)`,
      [childId]
    );

    // Build set of covered objective IDs
    const coveredObjectiveIds = new Set<number>();
    for (const obj of completedObjectives) {
      coveredObjectiveIds.add(obj.objective_id);
    }
    for (const obj of coveredViaExercises) {
      coveredObjectiveIds.add(obj.objective_id);
    }

    // Find gaps (objectives not covered)
    const gaps: CurriculumGap[] = [];
    for (const obj of objectives) {
      if (!coveredObjectiveIds.has(obj.id)) {
        gaps.push({
          id: obj.id,
          code: obj.code,
          description: obj.description,
          categoryId: obj.category_id,
          categoryName: obj.category_name_sv
        });
      }
    }

    res.json({
      childId,
      childGradeLevel: child.grade_level,
      gaps,
      totalGaps: gaps.length,
      totalObjectives: objectives.length
    });
  } catch (error) {
    console.error('Get curriculum gaps error:', error);
    res.status(500).json({ error: 'Failed to get curriculum gaps' });
  }
});

// Types for recommendations
interface PackageRecommendation {
  packageId: string;
  packageName: string;
  gradeLevel: number;
  categoryId: string | null;
  categoryName: string | null;
  problemCount: number;
  description: string | null;
  objectivesCovered: number;
}

interface GapRecommendation {
  objective: CurriculumGap;
  packages: PackageRecommendation[];
}

// GET /curriculum/recommendations/:childId - Get recommended packages to fill curriculum gaps
router.get('/recommendations/:childId', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const childId = req.params.childId;

    // Verify child belongs to parent
    const child = db.get<Child & { grade_level: number }>(
      'SELECT id, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get all curriculum objectives for the child's grade level
    const objectives = db.all<CurriculumObjective & { category_name_sv: string }>(
      `SELECT co.*, mc.name_sv as category_name_sv
       FROM curriculum_objectives co
       JOIN math_categories mc ON co.category_id = mc.id
       WHERE co.grade_levels LIKE ?
       ORDER BY mc.name_sv, co.code`,
      [`%"${child.grade_level}"%`]
    );

    // Get completed objectives for this child (from child_curriculum_progress)
    const completedObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ccp.objective_id
       FROM child_curriculum_progress ccp
       WHERE ccp.child_id = ?`,
      [childId]
    );

    // Also check objectives covered via exercise-curriculum mapping for completed assignments
    // Exclude answers where a hint was purchased
    const coveredViaExercises = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ecm.objective_id
       FROM exercise_curriculum_mapping ecm
       JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
       LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
         AND COALESCE(aa.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
       LEFT JOIN math_problems mp ON mp.assignment_id = a.id AND mp.is_correct = 1
         AND COALESCE(mp.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'math_problem' AND ecm.exercise_id = mp.id
       LEFT JOIN reading_questions rq ON rq.assignment_id = a.id AND rq.is_correct = 1
         AND ecm.exercise_type = 'reading_question' AND ecm.exercise_id = rq.id
       WHERE (aa.id IS NOT NULL OR mp.id IS NOT NULL OR rq.id IS NOT NULL)`,
      [childId]
    );

    // Build set of covered objective IDs
    const coveredObjectiveIds = new Set<number>();
    for (const obj of completedObjectives) {
      coveredObjectiveIds.add(obj.objective_id);
    }
    for (const obj of coveredViaExercises) {
      coveredObjectiveIds.add(obj.objective_id);
    }

    // Find gaps (objectives not covered)
    const gaps: CurriculumGap[] = [];
    for (const obj of objectives) {
      if (!coveredObjectiveIds.has(obj.id)) {
        gaps.push({
          id: obj.id,
          code: obj.code,
          description: obj.description,
          categoryId: obj.category_id,
          categoryName: obj.category_name_sv
        });
      }
    }

    if (gaps.length === 0) {
      return res.json({
        childId,
        childGradeLevel: child.grade_level,
        recommendations: [],
        totalGaps: 0,
        message: 'No curriculum gaps found - all objectives are covered!'
      });
    }

    // Get packages that have exercises mapped to the gap objectives
    // Find packages where package_problems are mapped to the uncovered objectives
    const gapObjectiveIds = gaps.map(g => g.id);
    const placeholders = gapObjectiveIds.map(() => '?').join(',');

    // Query packages that have problems mapped to the gap objectives
    // Filter by child's grade level for ALL packages (both parent-owned and global)
    const packageMappings = db.all<{
      objective_id: number;
      package_id: string;
      package_name: string;
      grade_level: number;
      category_id: string | null;
      category_name: string | null;
      problem_count: number;
      description: string | null;
      is_global: number;
      parent_id: string;
    }>(
      `SELECT DISTINCT
         ecm.objective_id,
         mp.id as package_id,
         mp.name as package_name,
         mp.grade_level,
         mp.category_id,
         mc.name_sv as category_name,
         mp.problem_count,
         mp.description,
         mp.is_global,
         mp.parent_id
       FROM exercise_curriculum_mapping ecm
       JOIN package_problems pp ON ecm.exercise_type = 'package_problem' AND ecm.exercise_id = pp.id
       JOIN math_packages mp ON pp.package_id = mp.id
       LEFT JOIN math_categories mc ON mp.category_id = mc.id
       WHERE ecm.objective_id IN (${placeholders})
         AND mp.is_active = 1
         AND mp.grade_level = ?
         AND (mp.parent_id = ? OR mp.is_global = 1)
       ORDER BY mp.grade_level, mp.name`,
      [...gapObjectiveIds, child.grade_level, req.user!.id]
    );

    // Group packages by objective and count how many objectives each package covers
    const packageObjectiveCount = new Map<string, Set<number>>();
    const packageInfo = new Map<string, PackageRecommendation>();

    for (const mapping of packageMappings) {
      if (!packageObjectiveCount.has(mapping.package_id)) {
        packageObjectiveCount.set(mapping.package_id, new Set());
        packageInfo.set(mapping.package_id, {
          packageId: mapping.package_id,
          packageName: mapping.package_name,
          gradeLevel: mapping.grade_level,
          categoryId: mapping.category_id,
          categoryName: mapping.category_name,
          problemCount: mapping.problem_count,
          description: mapping.description,
          objectivesCovered: 0
        });
      }
      packageObjectiveCount.get(mapping.package_id)!.add(mapping.objective_id);
    }

    // Update objectivesCovered count
    for (const [packageId, objectives] of packageObjectiveCount) {
      const info = packageInfo.get(packageId)!;
      info.objectivesCovered = objectives.size;
    }

    // Build recommendations: for each gap, list packages that cover it
    const recommendations: GapRecommendation[] = [];
    const objectiveToPackages = new Map<number, PackageRecommendation[]>();

    for (const mapping of packageMappings) {
      if (!objectiveToPackages.has(mapping.objective_id)) {
        objectiveToPackages.set(mapping.objective_id, []);
      }
      const pkg = packageInfo.get(mapping.package_id)!;
      // Only add if not already in the list
      const existingPkgs = objectiveToPackages.get(mapping.objective_id)!;
      if (!existingPkgs.some(p => p.packageId === pkg.packageId)) {
        existingPkgs.push(pkg);
      }
    }

    // Sort packages by objectivesCovered (most coverage first)
    for (const [, packages] of objectiveToPackages) {
      packages.sort((a, b) => b.objectivesCovered - a.objectivesCovered);
    }

    // Build final recommendations array
    for (const gap of gaps) {
      const packages = objectiveToPackages.get(gap.id) || [];
      recommendations.push({
        objective: gap,
        packages
      });
    }

    // Sort recommendations: gaps with available packages first, then by category
    recommendations.sort((a, b) => {
      // Gaps with packages come first
      const aHasPackages = a.packages.length > 0 ? 0 : 1;
      const bHasPackages = b.packages.length > 0 ? 0 : 1;
      if (aHasPackages !== bHasPackages) return aHasPackages - bHasPackages;
      // Then sort by category name
      return a.objective.categoryName.localeCompare(b.objective.categoryName, 'sv');
    });

    // Get unique recommended packages (packages that cover most gaps)
    const uniquePackages = Array.from(packageInfo.values())
      .sort((a, b) => b.objectivesCovered - a.objectivesCovered);

    res.json({
      childId,
      childGradeLevel: child.grade_level,
      recommendations,
      totalGaps: gaps.length,
      gapsWithPackages: recommendations.filter(r => r.packages.length > 0).length,
      topPackages: uniquePackages.slice(0, 5) // Top 5 packages that cover the most gaps
    });
  } catch (error) {
    console.error('Get curriculum recommendations error:', error);
    res.status(500).json({ error: 'Failed to get curriculum recommendations' });
  }
});

// GET /curriculum/generation-suggestions/:childId - Get suggestions for generating new content
router.get('/generation-suggestions/:childId', authenticateParent, (req, res) => {
  try {
    const db = getDb();
    const childId = req.params.childId;

    // Verify child belongs to parent
    const child = db.get<Child & { name: string; grade_level: number }>(
      'SELECT id, name, grade_level FROM children WHERE id = ? AND parent_id = ?',
      [childId, req.user!.id]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get all curriculum objectives for the child's grade level
    const objectives = db.all<CurriculumObjective & { category_name_sv: string }>(
      `SELECT co.*, mc.name_sv as category_name_sv
       FROM curriculum_objectives co
       JOIN math_categories mc ON co.category_id = mc.id
       WHERE co.grade_levels LIKE ?
       ORDER BY mc.name_sv, co.code`,
      [`%"${child.grade_level}"%`]
    );

    // Get completed objectives for this child
    const completedObjectives = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ccp.objective_id
       FROM child_curriculum_progress ccp
       WHERE ccp.child_id = ?`,
      [childId]
    );

    // Also check objectives covered via exercise-curriculum mapping
    const coveredViaExercises = db.all<{ objective_id: number }>(
      `SELECT DISTINCT ecm.objective_id
       FROM exercise_curriculum_mapping ecm
       JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
       LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id AND aa.is_correct = 1
         AND COALESCE(aa.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
       LEFT JOIN math_problems mp ON mp.assignment_id = a.id AND mp.is_correct = 1
         AND COALESCE(mp.hint_purchased, 0) = 0
         AND ecm.exercise_type = 'math_problem' AND ecm.exercise_id = mp.id
       LEFT JOIN reading_questions rq ON rq.assignment_id = a.id AND rq.is_correct = 1
         AND ecm.exercise_type = 'reading_question' AND ecm.exercise_id = rq.id
       WHERE (aa.id IS NOT NULL OR mp.id IS NOT NULL OR rq.id IS NOT NULL)`,
      [childId]
    );

    // Build set of covered objective IDs
    const coveredObjectiveIds = new Set<number>();
    for (const obj of completedObjectives) {
      coveredObjectiveIds.add(obj.objective_id);
    }
    for (const obj of coveredViaExercises) {
      coveredObjectiveIds.add(obj.objective_id);
    }

    // Find gaps grouped by category
    const gapsByCategory = new Map<string, { categoryName: string; objectives: { code: string; description: string }[] }>();

    for (const obj of objectives) {
      if (!coveredObjectiveIds.has(obj.id)) {
        if (!gapsByCategory.has(obj.category_id)) {
          gapsByCategory.set(obj.category_id, {
            categoryName: obj.category_name_sv,
            objectives: []
          });
        }
        gapsByCategory.get(obj.category_id)!.objectives.push({
          code: obj.code,
          description: obj.description
        });
      }
    }

    // Convert to array and sort by number of gaps (most gaps first)
    const categorizedGaps = Array.from(gapsByCategory.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        objectives: data.objectives,
        gapCount: data.objectives.length
      }))
      .sort((a, b) => b.gapCount - a.gapCount);

    // Generate suggestions - pick top objectives from different categories for variety
    const suggestedCodes: string[] = [];
    const maxSuggestions = 6;

    // Round-robin through categories to get variety
    let categoryIndex = 0;
    while (suggestedCodes.length < maxSuggestions && categorizedGaps.length > 0) {
      const category = categorizedGaps[categoryIndex % categorizedGaps.length];
      const unusedObjectives = category.objectives.filter(o => !suggestedCodes.includes(o.code));

      if (unusedObjectives.length > 0) {
        suggestedCodes.push(unusedObjectives[0].code);
      }

      categoryIndex++;

      // Stop if we've gone through all categories without adding anything
      if (categoryIndex >= categorizedGaps.length * 2) break;
    }

    // Build generation prompt
    const suggestedObjectives = objectives
      .filter(o => suggestedCodes.includes(o.code))
      .map(o => ({ code: o.code, description: o.description, categoryName: o.category_name_sv }));

    // Generate prompts with different objective combinations (5-20 questions each)
    // Separate math (MA-*) and reading (SV-*) objectives - never mix subjects
    // Include explanations with gap counts and recommendations
    const prompts: { label: string; prompt: string; description: string; gapsAddressed: number; reason: string }[] = [];

    if (categorizedGaps.length > 0) {
      // Separate math and reading gaps
      const mathGaps = categorizedGaps.filter(c => c.categoryId !== 'lasforstaelse');
      const readingGaps = categorizedGaps.filter(c => c.categoryId === 'lasforstaelse');

      // Calculate total math and reading gaps
      const totalMathGaps = mathGaps.reduce((sum, c) => sum + c.gapCount, 0);
      const totalReadingGaps = readingGaps.reduce((sum, c) => sum + c.gapCount, 0);

      // Generate math prompts
      if (mathGaps.length > 0) {
        const allMathObjectives: { code: string; category: string; description: string }[] = [];
        for (const cat of mathGaps) {
          for (const obj of cat.objectives) {
            allMathObjectives.push({ code: obj.code, category: cat.categoryName, description: obj.description });
          }
        }

        // Math Prompt 1: Mixed from different math categories (3-4 objectives)
        if (allMathObjectives.length >= 3) {
          const mixedCodes = allMathObjectives.slice(0, 4).map(o => o.code);
          prompts.push({
            label: `${mixedCodes.join(', ')}`,
            prompt: `Use generate-math skill for årskurs ${child.grade_level}, 15 problems covering: ${mixedCodes.join(', ')}`,
            description: 'Mixed math',
            gapsAddressed: mixedCodes.length,
            reason: `Covers ${mixedCodes.length} objectives from ${mathGaps.slice(0, 3).map(c => c.categoryName).join(', ')}. Good for variety across topics.`
          });
        }

        // Math Prompt 2: Focus on weakest math category
        const weakestMath = mathGaps[0];
        const weakestMathCodes = weakestMath.objectives.slice(0, 3).map(o => o.code);
        if (weakestMathCodes.length > 0) {
          prompts.push({
            label: `${weakestMathCodes.join(', ')}`,
            prompt: `Use generate-math skill for årskurs ${child.grade_level}, 12 problems covering: ${weakestMathCodes.join(', ')}`,
            description: weakestMath.categoryName,
            gapsAddressed: weakestMathCodes.length,
            reason: `Focuses on "${weakestMath.categoryName}" - your weakest area with ${weakestMath.gapCount} uncovered objectives.`
          });
        }

        // Math Prompt 3: Second math category if available
        if (mathGaps.length > 1) {
          const secondMath = mathGaps[1];
          const secondMathCodes = secondMath.objectives.slice(0, 3).map(o => o.code);
          if (secondMathCodes.length > 0) {
            prompts.push({
              label: `${secondMathCodes.join(', ')}`,
              prompt: `Use generate-math skill for årskurs ${child.grade_level}, 10 problems covering: ${secondMathCodes.join(', ')}`,
              description: secondMath.categoryName,
              gapsAddressed: secondMathCodes.length,
              reason: `Targets "${secondMath.categoryName}" - second most gaps with ${secondMath.gapCount} uncovered objectives.`
            });
          }
        }

        // Math Prompt 4: Single objective deep dive
        if (allMathObjectives.length > 0) {
          const singleObj = allMathObjectives[0];
          prompts.push({
            label: `${singleObj.code} (deep)`,
            prompt: `Use generate-math skill for årskurs ${child.grade_level}, 8 problems focusing deeply on: ${singleObj.code}`,
            description: `Deep: ${singleObj.category}`,
            gapsAddressed: 1,
            reason: `Deep practice on "${singleObj.description}" - mastery-focused with varied difficulty.`
          });
        }

        // Math Prompt 5: Quick pair
        if (allMathObjectives.length >= 2) {
          const quickCodes = [allMathObjectives[0].code, allMathObjectives[1].code];
          prompts.push({
            label: `${quickCodes.join(', ')}`,
            prompt: `Use generate-math skill for årskurs ${child.grade_level}, 6 problems covering: ${quickCodes.join(', ')}`,
            description: 'Quick math',
            gapsAddressed: 2,
            reason: 'Quick practice session - covers 2 objectives with 6 problems. Good for shorter sessions.'
          });
        }
      }

      // Generate reading prompts (separate from math)
      if (readingGaps.length > 0) {
        const allReadingObjectives = readingGaps[0].objectives;

        if (allReadingObjectives.length >= 2) {
          const readingCodes = allReadingObjectives.slice(0, 3).map(o => o.code);
          prompts.push({
            label: `${readingCodes.join(', ')}`,
            prompt: `Use generate-reading skill for årskurs ${child.grade_level}, 10 questions covering: ${readingCodes.join(', ')}`,
            description: 'Reading comprehension',
            gapsAddressed: readingCodes.length,
            reason: `Covers ${readingCodes.length} reading skills. Total of ${totalReadingGaps} reading gaps to address.`
          });
        }

        if (allReadingObjectives.length > 0) {
          const singleReading = allReadingObjectives[0];
          prompts.push({
            label: `${singleReading.code} (deep)`,
            prompt: `Use generate-reading skill for årskurs ${child.grade_level}, 8 questions focusing on: ${singleReading.code}`,
            description: 'Reading focus',
            gapsAddressed: 1,
            reason: `Deep practice on "${singleReading.description}" - focused reading comprehension.`
          });
        }
      }
    }

    res.json({
      childId,
      childName: child.name,
      childGradeLevel: child.grade_level,
      totalGaps: objectives.length - coveredObjectiveIds.size,
      categorizedGaps,
      suggestedCodes,
      suggestedObjectives,
      prompts
    });
  } catch (error) {
    console.error('Get generation suggestions error:', error);
    res.status(500).json({ error: 'Failed to get generation suggestions' });
  }
});

export default router;
