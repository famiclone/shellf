-- Fixed kinds: Game, Audio, Video, Card, Book
-- Remap legacy kinds (figure/lego/disc/cassette/other) onto this set.

INSERT OR IGNORE INTO kinds (slug, name, is_system, features) VALUES
  ('game', 'Game', 1, '{"emulator":true,"rom":true,"patches":true,"saves":true,"scrape":true}'),
  ('audio', 'Audio', 1, '{}'),
  ('video', 'Video', 1, '{}'),
  ('card', 'Card', 1, '{}'),
  ('book', 'Book', 1, '{}');

UPDATE kinds SET name = 'Game', is_system = 1,
  features = '{"emulator":true,"rom":true,"patches":true,"saves":true,"scrape":true}'
WHERE slug = 'game';

UPDATE kinds SET name = 'Audio', is_system = 1, features = '{}' WHERE slug = 'audio';
UPDATE kinds SET name = 'Video', is_system = 1, features = '{}' WHERE slug = 'video';
UPDATE kinds SET name = 'Card', is_system = 1, features = '{}' WHERE slug = 'card';
UPDATE kinds SET name = 'Book', is_system = 1, features = '{}' WHERE slug = 'book';

-- Remap groups & items from legacy kind slugs
UPDATE groups SET kind_id = (SELECT id FROM kinds WHERE slug = 'card')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug IN ('figure', 'lego'));

UPDATE items SET kind_id = (SELECT id FROM kinds WHERE slug = 'card')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug IN ('figure', 'lego'));

UPDATE groups SET kind_id = (SELECT id FROM kinds WHERE slug = 'video')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'disc');

UPDATE items SET kind_id = (SELECT id FROM kinds WHERE slug = 'video')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'disc');

UPDATE groups SET kind_id = (SELECT id FROM kinds WHERE slug = 'audio')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'cassette');

UPDATE items SET kind_id = (SELECT id FROM kinds WHERE slug = 'audio')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'cassette');

UPDATE groups SET kind_id = (SELECT id FROM kinds WHERE slug = 'game')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'other')
   OR kind_id IS NULL;

UPDATE items SET kind_id = (SELECT id FROM kinds WHERE slug = 'game')
WHERE kind_id IN (SELECT id FROM kinds WHERE slug = 'other');

-- Drop obsolete kinds (safe after remap; FKs should be clear)
DELETE FROM kinds WHERE slug IN ('figure', 'lego', 'disc', 'cassette', 'other');
