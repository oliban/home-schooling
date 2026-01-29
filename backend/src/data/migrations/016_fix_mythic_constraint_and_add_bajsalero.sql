-- Migration: Add Bajsalero if it doesn't exist
-- NOTE: The table recreation has been removed because schema.sql already has
-- the correct CHECK constraint and column structure. This migration now only
-- ensures Bajsalero exists for databases that were created before it was added.

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
