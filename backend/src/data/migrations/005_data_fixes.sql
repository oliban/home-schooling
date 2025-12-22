-- Data fixes for production
-- Generated: 2024-12-23
-- Run this on production after migration 004

-- Fix Harry Potter Kapitel 4 grade level (was incorrectly set to 3, should be 5)
UPDATE math_packages
SET grade_level = 5
WHERE id = 'ed4afe18-be89-4608-8dcf-d86a3a22044e'
  AND name LIKE '%Harry Potter%Kapitel 4%';
