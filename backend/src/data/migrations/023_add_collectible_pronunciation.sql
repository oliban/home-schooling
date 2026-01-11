-- Migration: Add pronunciation column to collectibles
-- This allows specifying how a brainrot name should be pronounced
-- (useful when the name spelling doesn't match Italian pronunciation rules)

-- Add pronunciation column
ALTER TABLE collectibles ADD COLUMN pronunciation TEXT;

-- Set pronunciation for Bajsalero Bajsala (phonetic spelling for Italian TTS)
UPDATE collectibles
SET pronunciation = 'Bajaléro Bajsalà'
WHERE id = 'bajsalero_bajsala';
