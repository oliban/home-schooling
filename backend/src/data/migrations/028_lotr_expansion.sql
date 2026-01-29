-- LOTR Italian Expansion Pack
-- Adds support for SVG portraits and expansion packs

ALTER TABLE collectibles ADD COLUMN svg_path TEXT;
ALTER TABLE collectibles ADD COLUMN expansion_pack TEXT;
