-- Initialize LOTR drops for all existing children
-- Sets unlocked_lotr_items to 5 for children who have NULL or 0
-- The WHICH 5 items each child sees is randomized by the seeded order in collectibles.ts
-- (based on child rowid, so each child sees different random 5)

UPDATE children
SET unlocked_lotr_items = 5
WHERE unlocked_lotr_items IS NULL OR unlocked_lotr_items = 0;
