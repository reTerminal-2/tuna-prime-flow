-- Migration: Add branding and contact columns to store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_description TEXT,
ADD COLUMN IF NOT EXISTS store_address TEXT,
ADD COLUMN IF NOT EXISTS store_email TEXT,
ADD COLUMN IF NOT EXISTS store_phone TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS profile_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

COMMENT ON COLUMN store_settings.profile_url IS 'URL for the store profile picture';
COMMENT ON COLUMN store_settings.cover_url IS 'URL for the store cover photo';
