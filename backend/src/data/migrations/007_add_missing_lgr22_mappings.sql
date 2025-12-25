-- Migration 007: Add missing LGR22 curriculum mappings
--
-- Adds LGR22 codes to 2 packages that were created before validation was added:
-- 1. Addition & Subtraktion - Årskurs 3, Super Mario (10 problems)
-- 2. Ekvationer & Sannolikhet - Årskurs 6, Minecraft & One Piece (20 problems)
--
-- This migration is idempotent - uses INSERT OR IGNORE

-- ============================================================================
-- Package 1: Addition & Subtraktion - Årskurs 3, Super Mario
-- All problems map to: MA-TAL-01 (Natural numbers), MA-PRO-03 (Problem solving with +/-)
-- ============================================================================

-- Map all 10 problems to MA-TAL-01
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = '0109712e-b3d2-44f3-853b-a7e7c56d3d32'
  AND co.code = 'MA-TAL-01';

-- Map all 10 problems to MA-PRO-03
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = '0109712e-b3d2-44f3-853b-a7e7c56d3d32'
  AND co.code = 'MA-PRO-03';

-- ============================================================================
-- Package 2: Ekvationer & Sannolikhet - Årskurs 6, Minecraft & One Piece
-- Problems 1-10: Equations (MA-ALG-04, MA-PRO-04)
-- Problems 11-20: Probability (MA-SAN-03, MA-PRO-04)
-- ============================================================================

-- Map problems 1-10 to MA-ALG-04 (Equation solving)
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = 'bb645fa8-f3f1-48f7-bbe1-65d97eebe985'
  AND pp.problem_number BETWEEN 1 AND 10
  AND co.code = 'MA-ALG-04';

-- Map problems 1-10 to MA-PRO-04 (Problem solving)
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = 'bb645fa8-f3f1-48f7-bbe1-65d97eebe985'
  AND pp.problem_number BETWEEN 1 AND 10
  AND co.code = 'MA-PRO-04';

-- Map problems 11-20 to MA-SAN-03 (Probability)
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = 'bb645fa8-f3f1-48f7-bbe1-65d97eebe985'
  AND pp.problem_number BETWEEN 11 AND 20
  AND co.code = 'MA-SAN-03';

-- Map problems 11-20 to MA-PRO-04 (Problem solving)
INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
SELECT 'package_problem', pp.id, co.id
FROM package_problems pp
JOIN math_packages mp ON pp.package_id = mp.id
CROSS JOIN curriculum_objectives co
WHERE mp.id = 'bb645fa8-f3f1-48f7-bbe1-65d97eebe985'
  AND pp.problem_number BETWEEN 11 AND 20
  AND co.code = 'MA-PRO-04';
