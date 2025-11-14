-- First, ensure user_id columns exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pricing_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop all existing policies for clean slate
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Users can view their own pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Users can manage their own pricing rules" ON public.pricing_rules;

DROP POLICY IF EXISTS "Users can view their own pricing logs" ON public.pricing_logs;
DROP POLICY IF EXISTS "Users can insert their own pricing logs" ON public.pricing_logs;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view their own stock adjustments" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Users can insert their own stock adjustments" ON public.stock_adjustments;

-- Create new user-isolated policies for products
CREATE POLICY "user_select_products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_delete_products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- Create new user-isolated policies for suppliers
CREATE POLICY "user_select_suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_suppliers" ON public.suppliers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_delete_suppliers" ON public.suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- Create new user-isolated policies for pricing_rules
CREATE POLICY "user_select_pricing_rules" ON public.pricing_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_all_pricing_rules" ON public.pricing_rules
  FOR ALL USING (auth.uid() = user_id);

-- Create new user-isolated policies for pricing_logs
CREATE POLICY "user_select_pricing_logs" ON public.pricing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_insert_pricing_logs" ON public.pricing_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create new user-isolated policies for transactions
CREATE POLICY "user_select_transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "user_insert_transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create new user-isolated policies for stock_adjustments
CREATE POLICY "user_select_stock_adjustments" ON public.stock_adjustments
  FOR SELECT USING (auth.uid() = adjusted_by);

CREATE POLICY "user_insert_stock_adjustments" ON public.stock_adjustments
  FOR INSERT WITH CHECK (auth.uid() = adjusted_by);