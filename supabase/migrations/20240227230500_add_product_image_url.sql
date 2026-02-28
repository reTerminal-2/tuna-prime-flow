-- Migration: Add image_url to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN products.image_url IS 'Public URL for the product image';
