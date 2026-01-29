-- LOTR Daily Drop System
-- Adds separate counter for LOTR expansion unlocks (1 per day)

-- Add column to track LOTR unlocked items (separate from regular shop)
ALTER TABLE children ADD COLUMN unlocked_lotr_items INTEGER DEFAULT 5;

-- Remove always_visible from LOTR items (they'll use the new counter instead)
UPDATE collectibles SET always_visible = 0 WHERE expansion_pack = 'lotr-italian';
