-- Extended center profile fields for comprehensive listing
ALTER TABLE centers ADD COLUMN IF NOT EXISTS who_we_treat TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS approaches TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS aftercare TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS activities TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS accommodations TEXT[] DEFAULT '{}';
