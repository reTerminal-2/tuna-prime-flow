-- Migration: Add multi-image support to products gallery
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- Migrate existing single image_url to the new images array
UPDATE products 
SET images = jsonb_build_array(image_url) 
WHERE image_url IS NOT NULL AND (images IS NULL OR images = '[]'::jsonb);

COMMENT ON COLUMN products.images IS 'Gallery of product images stored as a JSON array of URLs';
