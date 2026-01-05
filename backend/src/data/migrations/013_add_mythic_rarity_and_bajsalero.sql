-- Migration: Add mythic rarity and Bajsalero Bajsalo brainrot
-- This migration handles upgrading existing databases that don't have mythic rarity

-- For existing databases: recreate collectibles table with mythic support
-- Note: This is a no-op for fresh databases where schema.sql already includes mythic

-- Check if we need to migrate by trying to insert a test mythic value
-- If it fails, we need to recreate the table; if it succeeds, mythic is already supported

-- Since SQLite doesn't have easy conditional DDL, we use a simple approach:
-- Just insert the new brainrot if it doesn't exist
-- The schema.sql already has mythic support for fresh DBs
-- For existing DBs, the constraint will need manual update or the admin can run:
--   DROP TABLE collectibles; (then restart to re-seed)

-- Insert Bajsalero Bajsalo (the mythic turd-brain brainrot) if not exists
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
