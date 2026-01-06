-- Migration: Fix Bajsalero name, id, and rarity
-- ID: 'bajsalero_bajsalo' -> 'bajsalero_bajsala'
-- Name: 'Bajsalero Bajsalo' -> 'Bajsalero Bajsala'
-- Rarity: 'mythic' -> 'secret'
-- Also adds 'secret' to the rarity CHECK constraint

PRAGMA foreign_keys = OFF;

-- Create new table with 'secret' added to rarity constraint
CREATE TABLE collectibles_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ascii_art TEXT NOT NULL,
    price INTEGER NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic', 'secret')),
    always_visible INTEGER DEFAULT 0
);

-- Copy existing data
INSERT INTO collectibles_new (id, name, ascii_art, price, rarity, always_visible)
SELECT id, name, ascii_art, price, rarity, COALESCE(always_visible, 0) FROM collectibles;

-- Drop old table and rename new one
DROP TABLE collectibles;
ALTER TABLE collectibles_new RENAME TO collectibles;

PRAGMA foreign_keys = ON;

-- Fix Bajsalero: correct id, name, and rarity
-- First update any child_collectibles references
UPDATE child_collectibles
SET collectible_id = 'bajsalero_bajsala'
WHERE collectible_id = 'bajsalero_bajsalo';

-- Then update the collectible itself
UPDATE collectibles
SET id = 'bajsalero_bajsala', name = 'Bajsalero Bajsala', rarity = 'secret'
WHERE id = 'bajsalero_bajsalo';
