-- Fix multiple choice questions where correct_answer doesn't match any available option
-- This fixes issues caused by migration 024 which incorrectly set "cirka 30" to "C"
-- when options were only ["A: Cirka 30", "B: Cirka 40"]

-- Fix answers that are 'C' but options don't include C
UPDATE package_problems
SET correct_answer = 'A'
WHERE answer_type = 'multiple_choice'
  AND correct_answer = 'C'
  AND options NOT LIKE '%"C:%';

-- Fix answers that are 'D' but options don't include D
UPDATE package_problems
SET correct_answer = 'A'
WHERE answer_type = 'multiple_choice'
  AND correct_answer = 'D'
  AND options NOT LIKE '%"D:%';

-- Fix the specific problem with empty options (extract from question text)
UPDATE package_problems
SET options = '["A: Framför", "B: Bakom", "C: Bredvid"]'
WHERE id = '36e59ada-53b8-4f75-8dfc-62f418f85b96'
  AND (options IS NULL OR options = '' OR options = '[]');
