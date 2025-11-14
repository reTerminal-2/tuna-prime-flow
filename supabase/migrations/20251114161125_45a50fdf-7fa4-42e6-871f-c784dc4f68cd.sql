-- Drop the global SKU unique constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;

-- Add a composite unique constraint for SKU per user
ALTER TABLE public.products ADD CONSTRAINT products_user_sku_key UNIQUE (user_id, sku);