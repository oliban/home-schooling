-- Fix multiple choice questions where correct_answer contains full text instead of just the letter
-- Example: "A: Ja" should be just "A"
-- This fixes issues where the submit button appears to do nothing because validation fails

UPDATE package_problems
SET correct_answer = SUBSTR(correct_answer, 1, 1)
WHERE answer_type = 'multiple_choice'
  AND LENGTH(correct_answer) > 1
  AND (correct_answer LIKE 'A:%' OR correct_answer LIKE 'B:%'
       OR correct_answer LIKE 'C:%' OR correct_answer LIKE 'D:%');
