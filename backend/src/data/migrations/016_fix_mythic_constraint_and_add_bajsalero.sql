-- Migration: Fix rarity CHECK constraint to include 'mythic' and 'secret'
-- SQLite requires recreating the table to modify CHECK constraints
-- NOTE: This migration only copies columns that exist at this point in sequence.
-- svg_path and expansion_pack are added later by migration 028.

PRAGMA foreign_keys = OFF;

-- Create new table with correct constraint (only columns that exist at migration 016)
CREATE TABLE IF NOT EXISTS collectibles_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ascii_art TEXT NOT NULL,
    price INTEGER NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic', 'secret')),
    always_visible INTEGER DEFAULT 0,
    pronunciation TEXT
);

-- Copy existing data (only columns that exist at this point)
INSERT OR IGNORE INTO collectibles_new (id, name, ascii_art, price, rarity, always_visible, pronunciation)
SELECT
    id,
    name,
    ascii_art,
    price,
    rarity,
    COALESCE(always_visible, 0),
    pronunciation
FROM collectibles;

-- Drop old table and rename new one
DROP TABLE IF EXISTS collectibles;
ALTER TABLE collectibles_new RENAME TO collectibles;

PRAGMA foreign_keys = ON;

-- Insert Bajsalero Bajsalo (OR IGNORE handles if it already exists)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES (
    'bajsalero_bajsalo',
    'Bajsalero Bajsalo',
    '    @@@@@@
   @  ~~  @
  @  @@@@  @
  @ @@  @@ @
   @ ~~~~ @
    \    /
     \  /
      \/
    ~~~~~~',
    2000,
    'mythic',
    1
);
