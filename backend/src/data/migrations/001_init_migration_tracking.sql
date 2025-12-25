-- Migration 001: Initialize migration tracking system
--
-- This migration bootstraps the tracking system by marking previously-run
-- migrations (002-006) as already applied. This prevents them from running
-- again when the tracking system is first deployed.
--
-- Run order: This runs FIRST (001) before other migrations due to alphabetical sorting

-- Ensure schema_migrations table exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mark migrations 002-006 as already applied
-- These migrations were run before the tracking system was implemented
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES
    ('002_add_curriculum_tables', '2024-12-23 09:37:00'),
    ('003_add_reading_objectives', '2024-12-22 23:18:00'),
    ('005_data_fixes', '2024-12-23 00:09:00'),
    ('006_harry_shop_unlock', '2025-12-25 11:01:00');

-- Note: Migration 004 is disabled (.sql.disabled) and intentionally excluded
-- Note: Migration 007 will run normally as it's new
