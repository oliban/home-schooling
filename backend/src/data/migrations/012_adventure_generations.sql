-- Migration: Add adventure_generations table for child-created content
-- This enables the "Create Your Own Adventure" feature

-- Track child-generated adventures and their completion status
CREATE TABLE IF NOT EXISTS adventure_generations (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES math_packages(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    custom_theme TEXT,
    content_type TEXT CHECK (content_type IN ('math', 'reading')) NOT NULL,
    question_count INTEGER NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
    success_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_adventure_generations_child ON adventure_generations(child_id);
CREATE INDEX IF NOT EXISTS idx_adventure_generations_status ON adventure_generations(status);
CREATE INDEX IF NOT EXISTS idx_adventure_generations_assignment ON adventure_generations(assignment_id);

-- Add columns to math_packages to identify child-generated packages
-- Using a column that may already exist pattern
ALTER TABLE math_packages ADD COLUMN is_child_generated INTEGER DEFAULT 0;
ALTER TABLE math_packages ADD COLUMN generated_for_child_id TEXT REFERENCES children(id) ON DELETE SET NULL;
