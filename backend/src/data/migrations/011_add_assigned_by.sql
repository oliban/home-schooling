-- Migration: Add assigned_by_id to track who created the assignment
-- This allows tracking when admin users assign work to other parents' children

-- Add assigned_by_id column to assignments table
ALTER TABLE assignments ADD COLUMN assigned_by_id TEXT REFERENCES parents(id);

-- For existing assignments, set assigned_by_id to parent_id (they're the same for legacy data)
UPDATE assignments SET assigned_by_id = parent_id WHERE assigned_by_id IS NULL;

-- Create index for faster lookups of who assigned what
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by_id);
