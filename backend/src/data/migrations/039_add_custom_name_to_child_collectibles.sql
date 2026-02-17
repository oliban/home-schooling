-- Migration 039: Add custom_name to child_collectibles
-- Allows children to rename their owned brainrots with a custom display name.
-- If custom_name is NULL, the collectible's original name is used.
ALTER TABLE child_collectibles ADD COLUMN custom_name TEXT;
