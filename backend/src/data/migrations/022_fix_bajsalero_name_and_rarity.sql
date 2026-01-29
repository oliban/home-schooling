-- Migration: Fix Bajsalero name, id, and rarity
-- NOTE: Table recreation removed - schema.sql already has correct CHECK constraint
-- This migration only handles renaming bajsalero_bajsalo -> bajsalero_bajsala for
-- databases that had the old name

-- If the old ID exists, delete it (the seed file already has the correct bajsalero_bajsala)
DELETE FROM collectibles WHERE id = 'bajsalero_bajsalo';

-- Update any child_collectibles that might reference the old ID
UPDATE child_collectibles
SET collectible_id = 'bajsalero_bajsala'
WHERE collectible_id = 'bajsalero_bajsalo';

-- Ensure bajsalero_bajsala has correct rarity (in case it was inserted with wrong rarity)
UPDATE collectibles
SET rarity = 'secret', always_visible = 1
WHERE id = 'bajsalero_bajsala';
