-- Migration: Set always_visible = 1 for all new secret brainrots and Ariana
-- This makes them appear in the shop directly, same as Bajsalero

-- Ariana Velocissima (legendary)
UPDATE collectibles SET always_visible = 1 WHERE id = 'ariana_velocissima';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('ariana_velocissima', 'Ariana Velocissima', '   ~~~ZOOM~~~
   /  ||||  \
  |  SKATES  |
  | >>   << |
   \ SPEED /
    \/\/\/
    //////
   ARIANA
  VELOCISSIMA', 1888, 'legendary', 1);

-- Pruttalero Pruttala (secret)
UPDATE collectibles SET always_visible = 1 WHERE id = 'pruttalero_pruttala';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('pruttalero_pruttala', 'Pruttalero Pruttala', '   ~~~***~~~
  ~ PRRRRT ~
 ~  *****  ~
  ~ ~~~~~ ~
   ~~~ ~~~
    ( O )
    / | \
   /  |  \
  TORNADO
   POWER', 2500, 'secret', 1);

-- Sittalero Sittala (secret)
UPDATE collectibles SET always_visible = 1 WHERE id = 'sittalero_sittala';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('sittalero_sittala', 'Sittalero Sittala', '   _______
  |  ZzZ  |
  | /---\ |
  ||  O  ||
  || /|\ ||
  ||_/ \_||
 _|_________|_
 ULTIMATE
   SITTING
   MASTER', 2200, 'secret', 1);

-- Glassalero Glassala (secret)
UPDATE collectibles SET always_visible = 1 WHERE id = 'glassalero_glassala';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('glassalero_glassala', 'Glassalero Glassala', '    @@@@@@
   @@@**@@@
  @@@@**@@@@
   @@@**@@@
    @@**@@
     \**/ 
      \/
      ||
    ======
   MAXIMUM
    GLASS', 2300, 'secret', 1);

-- Bockalero Bockala (secret)
UPDATE collectibles SET always_visible = 1 WHERE id = 'bockalero_bockala';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('bockalero_bockala', 'Bockalero Bockala', '   /\   /\
  (  \_/  )
  |  O O  |
  |   ^   |
   \ === /
    |||||
   /| | |\
  / | | | \
 LEGENDARY
   GOAT', 2400, 'secret', 1);

-- Fiscilera Ficlila (secret)
UPDATE collectibles SET always_visible = 1 WHERE id = 'fiscilera_ficlila';
INSERT OR IGNORE INTO collectibles (id, name, ascii_art, price, rarity, always_visible)
VALUES ('fiscilera_ficlila', 'Fiscilera Ficlila', '    *NYPP*
   /  ||  \
  |   ||   |
   \  **  /
    \ ** /
     \**/
    TRICKY
    FINGER
   MASTER', 2600, 'secret', 1);
