-- Migration: Add admin flag to parents table
-- Version: 001
-- Date: 2025-12-30

-- Add is_admin column (default 0 = not admin)
ALTER TABLE parents ADD COLUMN is_admin INTEGER DEFAULT 0 CHECK (is_admin IN (0, 1));

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_parents_admin ON parents(is_admin) WHERE is_admin = 1;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('001-add-admin-flag');
