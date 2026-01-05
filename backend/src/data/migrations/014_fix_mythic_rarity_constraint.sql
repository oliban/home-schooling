-- Migration: Ensure Bajsalero Bajsalo exists
-- Schema.sql already includes mythic rarity support
-- This migration just ensures the collectible exists

-- Insert Bajsalero Bajsalo if not exists (schema already supports mythic)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity)
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
    'mythic'
);
