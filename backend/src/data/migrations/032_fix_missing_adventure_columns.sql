-- Migration: Fix missing columns from migration 012
-- The original migration 012 recorded success but ALTER TABLE failed silently
-- This adds the missing columns needed for child-generated adventures

ALTER TABLE math_packages ADD COLUMN is_child_generated INTEGER DEFAULT 0;
ALTER TABLE math_packages ADD COLUMN generated_for_child_id TEXT REFERENCES children(id) ON DELETE SET NULL;
