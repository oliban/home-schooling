-- One-time migration: Add 80 coins to Harry's account
-- Generated: 2025-12-25
-- Reason: Retroactive compensation for reading assignments not awarding coins (bug fixed)
-- Run this ONCE on production after next deploy

-- Add 80 coins to Harry's balance and total_earned
-- This finds the child named "Harry" and increases both balance and total_earned
UPDATE child_coins
SET
  balance = balance + 80,
  total_earned = total_earned + 80
WHERE child_id = (
  SELECT id FROM children WHERE name = 'Harry'
);

-- Verify the update (uncomment to see results)
-- SELECT c.name, cc.balance, cc.total_earned
-- FROM children c
-- JOIN child_coins cc ON c.id = cc.child_id
-- WHERE c.name = 'Harry';
