-- Migration: Add requires_sketch column to package_problems
-- This flag indicates problems that require visual/illustrative solutions via the sketchpad

ALTER TABLE package_problems ADD COLUMN requires_sketch INTEGER DEFAULT 0;
