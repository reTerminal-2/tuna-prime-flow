-- Migration: Add min_order column to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS min_order NUMERIC DEFAULT 1;

-- Data Cleanup
UPDATE products SET selling_price = 0 WHERE selling_price IS NULL;
UPDATE products SET current_stock = 0 WHERE current_stock IS NULL;
UPDATE products SET min_order = 1 WHERE min_order IS NULL;

COMMENT ON COLUMN products.min_order IS 'Minimum order quantity for this product';
