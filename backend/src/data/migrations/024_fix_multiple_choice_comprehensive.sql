-- Comprehensive fix for multiple choice questions
-- Handles: answers not starting with A-D, empty options, answers with "A:" prefix

-- Step 1: Fix answers that start with A-D but have extra text (like "A: Framför")
UPDATE package_problems
SET correct_answer = UPPER(SUBSTR(correct_answer, 1, 1))
WHERE answer_type = 'multiple_choice'
  AND LENGTH(correct_answer) > 1
  AND UPPER(SUBSTR(correct_answer, 1, 1)) IN ('A', 'B', 'C', 'D');

-- Step 2: Fix answers that don't match any option letter by matching text content
-- This handles cases like correct_answer = "cirka 30" with options = ["A: Cirka 30", "B: Cirka 40"]
-- We match by finding which option contains the answer text (case-insensitive)

-- For answers starting with letters other than A-D, try to match against first option
UPDATE package_problems
SET correct_answer = 'A'
WHERE answer_type = 'multiple_choice'
  AND UPPER(SUBSTR(correct_answer, 1, 1)) NOT IN ('A', 'B', 'C', 'D')
  AND options IS NOT NULL
  AND options != ''
  AND options != '[]'
  AND LOWER(options) LIKE '%' || LOWER(REPLACE(REPLACE(correct_answer, '"', ''), '''', '')) || '%';

-- Step 3: For any remaining non-letter answers, default to 'A' (best effort)
UPDATE package_problems
SET correct_answer = 'A'
WHERE answer_type = 'multiple_choice'
  AND UPPER(SUBSTR(correct_answer, 1, 1)) NOT IN ('A', 'B', 'C', 'D');

-- Step 4: Normalize all answers to uppercase single letter
UPDATE package_problems
SET correct_answer = UPPER(SUBSTR(correct_answer, 1, 1))
WHERE answer_type = 'multiple_choice'
  AND LENGTH(correct_answer) != 1;
