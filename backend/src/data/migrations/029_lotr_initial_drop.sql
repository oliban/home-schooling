-- LOTR Italian Expansion Pack - Initial Drop (5 characters)
-- First wave of LOTR collectibles available in the shop

-- Frodino Bagolini (Epic - 500 coins)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible, pronunciation, svg_path, expansion_pack)
VALUES (
    'frodino_bagolini',
    'Frodino Bagolini',
    '    .---.
   /     \
  | o   o |
  |   ^   |
   \_____/
    /   \
   RING',
    500,
    'epic',
    1,
    'Frodino Bagolini',
    '/portraits/lotr/frodo.svg',
    'lotr-italian'
);

-- Samuccio Ortolano (Rare - 300 coins)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible, pronunciation, svg_path, expansion_pack)
VALUES (
    'samuccio_ortolano',
    'Samuccio Ortolano',
    '    .---.
   / ~~~ \
  | o   o |
  |  ___  |
   \_____/
    TATERS',
    300,
    'rare',
    1,
    'Samuccio Ortolano',
    '/portraits/lotr/sam.svg',
    'lotr-italian'
);

-- Merrino Festoso (Common - 150 coins)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible, pronunciation, svg_path, expansion_pack)
VALUES (
    'merrino_festoso',
    'Merrino Festoso',
    '    .---.
   /     \
  | ^   ^ |
  |  \_/  |
   \_____/
    MERRY',
    150,
    'common',
    1,
    'Merrino Festoso',
    '/portraits/lotr/merry.svg',
    'lotr-italian'
);

-- Pippino Birichino (Common - 150 coins)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible, pronunciation, svg_path, expansion_pack)
VALUES (
    'pippino_birichino',
    'Pippino Birichino',
    '    .---.
   /     \
  | o   o |
  |  \_/  |
   \_____/
   SECOND
  BREAKFAST',
    150,
    'common',
    1,
    'Pippino Birichino',
    '/portraits/lotr/pippin.svg',
    'lotr-italian'
);

-- Gandalfo Grigiastro (Legendary - 1500 coins)
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible, pronunciation, svg_path, expansion_pack)
VALUES (
    'gandalfo_grigiastro',
    'Gandalfo Grigiastro',
    '      /\
     /  \
    / OO \
   |  \/  |
   | ~~~~ |
    \____/
     |  |
    WIZARD',
    1500,
    'legendary',
    1,
    'Gandalfo Grigiastro',
    '/portraits/lotr/gandalf.svg',
    'lotr-italian'
);
