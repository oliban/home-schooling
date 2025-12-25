-- One-time migration: Add 3 more shop items to Harry's unlocked inventory
-- Generated: 2025-12-25
-- Run this ONCE on production after next deploy

-- Unlock 3 additional shop items for Harry
-- This finds the child named "Harry" and increases unlocked_shop_items by 3
UPDATE children
SET unlocked_shop_items = unlocked_shop_items + 3
WHERE name = 'Harry';

-- Verify the update (uncomment to see results)
-- SELECT name, unlocked_shop_items FROM children WHERE name = 'Harry';
