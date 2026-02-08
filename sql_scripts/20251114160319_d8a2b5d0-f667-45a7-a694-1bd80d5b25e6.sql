-- Add user_id columns to tables that need user isolation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for products to filter by user
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Users can view their own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

CREATE POLICY "Users can view their own suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers" ON public.suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers" ON public.suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for pricing_rules
DROP POLICY IF EXISTS "Authenticated users can view pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Admins can manage pricing rules" ON public.pricing_rules;

CREATE POLICY "Users can view their own pricing rules" ON public.pricing_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pricing rules" ON public.pricing_rules
  FOR ALL USING (auth.uid() = user_id);

-- Update RLS policies for pricing_logs
DROP POLICY IF EXISTS "Authenticated users can view pricing logs" ON public.pricing_logs;
DROP POLICY IF EXISTS "System can insert pricing logs" ON public.pricing_logs;

CREATE POLICY "Users can view their own pricing logs" ON public.pricing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pricing logs" ON public.pricing_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for transactions to use created_by
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Update RLS policies for stock_adjustments to use adjusted_by
DROP POLICY IF EXISTS "Authenticated users can view stock adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Admins can insert stock adjustments" ON public.stock_adjustments;

CREATE POLICY "Users can view their own stock adjustments" ON public.stock_adjustments
  FOR SELECT USING (auth.uid() = adjusted_by);

CREATE POLICY "Users can insert their own stock adjustments" ON public.stock_adjustments
  FOR INSERT WITH CHECK (auth.uid() = adjusted_by);