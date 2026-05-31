-- Add virtual tour rooms to properties
-- Each room: { url: string, label: string }
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS tour_rooms JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN properties.tour_rooms IS
  'Array of {url, label} objects - one per room in the virtual tour';
