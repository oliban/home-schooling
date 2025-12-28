-- Add story_text column to math_packages table for AI-generated reading stories
-- Generated: 2025-12-28
-- Purpose: Enable storing AI-generated story text within reading packages
--          This allows "themed reading" assignments without requiring source books

ALTER TABLE math_packages ADD COLUMN story_text TEXT;

-- The story_text field will be used for:
-- - AI-generated themed reading stories (pokemon adventures, magic cats, etc.)
-- - Displayed to children before showing comprehension questions
-- - NULL for existing packages and math packages (backward compatible)
