-- Add images column to country_descriptions for caching Unsplash photos
ALTER TABLE country_descriptions ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
