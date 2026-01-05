-- Migration: Fix rarity CHECK constraint to include 'mythic' and add Bajsalero
-- SQLite requires recreating the table to modify CHECK constraints

PRAGMA foreign_keys = OFF;

-- Create new table with correct constraint
CREATE TABLE collectibles_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ascii_art TEXT NOT NULL,
    price INTEGER NOT NULL,
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    always_visible INTEGER DEFAULT 0
);

-- Copy existing data
INSERT INTO collectibles_new (id, name, ascii_art, price, rarity, always_visible)
SELECT id, name, ascii_art, price, rarity, COALESCE(always_visible, 0) FROM collectibles;

-- Drop old table and rename new one
DROP TABLE collectibles;
ALTER TABLE collectibles_new RENAME TO collectibles;

PRAGMA foreign_keys = ON;

-- Now insert Bajsalero Bajsalo
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
