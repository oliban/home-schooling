-- Migration: Add Bajsalero Bajsalo brainrot and set as always visible
-- Note: always_visible column was added by migration 014

-- Insert Bajsalero Bajsalo
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
