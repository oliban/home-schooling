-- Fix multiple choice questions where correct_answer contains the full text instead of just the letter
-- This fixes issues like correct_answer = "en fjärdedel" when it should be "A", "B", "C", or "D"

-- For package_problems table
-- We cannot easily do string manipulation in SQLite to extract the letter from JSON,
-- so we'll identify the problematic records and they need to be fixed manually or regenerated

-- Create a temporary table to log issues for manual review
CREATE TEMP TABLE IF NOT EXISTS mc_issues AS
SELECT
    'package_problems' as table_name,
    id,
    package_id,
    problem_number,
    question_text,
    correct_answer,
    options,
    'Multiple choice answer should be A/B/C/D, not full text' as issue
FROM package_problems
WHERE answer_type = 'multiple_choice'
  AND correct_answer NOT IN ('A', 'B', 'C', 'D')
  AND UPPER(SUBSTR(correct_answer, 1, 1)) NOT IN ('A', 'B', 'C', 'D');

-- Insert math_problems issues
INSERT INTO mc_issues
SELECT
    'math_problems' as table_name,
    id,
    NULL as package_id,
    problem_number,
    question_text,
    correct_answer,
    options,
    'Multiple choice answer should be A/B/C/D, not full text' as issue
FROM math_problems
WHERE answer_type = 'multiple_choice'
  AND correct_answer NOT IN ('A', 'B', 'C', 'D')
  AND UPPER(SUBSTR(correct_answer, 1, 1)) NOT IN ('A', 'B', 'C', 'D');

-- Log count of issues found
-- Note: This will be printed during migration if there are issues
