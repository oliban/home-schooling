-- Migration: Fix assignments stuck as in_progress due to unanswerable questions
--
-- This migration retroactively marks assignments as 'completed' when all
-- ANSWERABLE questions have been answered. Questions are unanswerable if
-- they are multiple_choice with NULL, empty, or single-option options.

-- Fix package-based assignments
-- A package problem is answerable if:
-- - answer_type is NOT 'multiple_choice', OR
-- - answer_type IS 'multiple_choice' AND options is valid JSON array with 2+ items
UPDATE assignments
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT a.id
  FROM assignments a
  WHERE a.status = 'in_progress'
    AND a.package_id IS NOT NULL
    AND (
      -- Count of answered questions
      SELECT COUNT(*)
      FROM assignment_answers aa
      WHERE aa.assignment_id = a.id AND aa.child_answer IS NOT NULL
    ) >= (
      -- Count of answerable questions in the package
      SELECT COUNT(*)
      FROM package_problems pp
      WHERE pp.package_id = a.package_id
        AND (
          pp.answer_type IS NULL
          OR pp.answer_type != 'multiple_choice'
          OR (
            pp.answer_type = 'multiple_choice'
            AND pp.options IS NOT NULL
            AND pp.options != ''
            AND pp.options != '[]'
            AND json_array_length(pp.options) >= 2
          )
        )
    )
);

-- Fix legacy reading assignments (all reading questions are multiple_choice)
UPDATE assignments
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT a.id
  FROM assignments a
  WHERE a.status = 'in_progress'
    AND a.package_id IS NULL
    AND a.assignment_type = 'reading'
    AND (
      -- Count of answered questions
      SELECT COUNT(*)
      FROM reading_questions rq
      WHERE rq.assignment_id = a.id AND rq.child_answer IS NOT NULL
    ) >= (
      -- Count of answerable questions (valid options with 2+ items)
      SELECT COUNT(*)
      FROM reading_questions rq
      WHERE rq.assignment_id = a.id
        AND rq.options IS NOT NULL
        AND rq.options != ''
        AND rq.options != '[]'
        AND json_array_length(rq.options) >= 2
    )
);

-- Fix legacy math assignments
UPDATE assignments
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT a.id
  FROM assignments a
  WHERE a.status = 'in_progress'
    AND a.package_id IS NULL
    AND a.assignment_type = 'math'
    AND (
      -- Count of answered questions
      SELECT COUNT(*)
      FROM math_problems mp
      WHERE mp.assignment_id = a.id AND mp.child_answer IS NOT NULL
    ) >= (
      -- Count of answerable questions
      SELECT COUNT(*)
      FROM math_problems mp
      WHERE mp.assignment_id = a.id
        AND (
          mp.answer_type IS NULL
          OR mp.answer_type != 'multiple_choice'
          OR (
            mp.answer_type = 'multiple_choice'
            AND mp.options IS NOT NULL
            AND mp.options != ''
            AND mp.options != '[]'
            AND json_array_length(mp.options) >= 2
          )
        )
    )
);
