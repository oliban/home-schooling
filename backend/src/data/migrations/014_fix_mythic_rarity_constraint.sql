-- Migration: Add Bajsalero Bajsalo mythic brainrot
-- Also adds always_visible column to bypass unlock system for specific items

-- Add always_visible column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for columns, but duplicate column errors
-- are handled gracefully by the migration runner
ALTER TABLE collectibles ADD COLUMN always_visible INTEGER DEFAULT 0;

-- Insert Bajsalero Bajsalo if not exists
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

-- Ensure always_visible is set (in case collectible already existed)
UPDATE collectibles SET always_visible = 1 WHERE id = 'bajsalero_bajsalo';
