-- ==============================================================================
-- MASTER FIX SCRIPT: Tables & Permissive RLS for Development
-- ==============================================================================

-- 1. Ensure all tables exist
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sku text not null,
  category text not null,
  description text,
  unit_of_measure text not null,
  cost_price numeric not null,
  selling_price numeric not null,
  current_stock numeric not null default 0,
  reorder_level numeric default 0,
  supplier_id uuid references public.suppliers(id),
  expiration_date date,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  status text not null,
  total_amount numeric not null,
  shipping_address text,
  payment_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity numeric not null,
  unit_price numeric not null,
  total_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  quantity numeric not null,
  unit_price numeric not null,
  cost_price numeric not null,
  total_amount numeric not null,
  profit numeric not null,
  transaction_date timestamp with time zone default timezone('utc'::text, now()),
  notes text,
  created_by uuid references auth.users(id)
);

create table if not exists public.stock_adjustments (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  quantity numeric not null,
  adjustment_type text not null,
  reason text,
  adjusted_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.store_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  store_name text,
  store_description text,
  logo_url text,
  currency text default 'PHP',
  notify_low_stock boolean default true,
  notify_expiring boolean default true,
  notify_new_order boolean default true,
  stock_alert_days integer default 7,
  enable_cod boolean default true,
  enable_shipping boolean default true,
  shipping_fee numeric default 0,
  min_order_amount numeric default 0,
  -- New fields
  store_address text,
  store_email text,
  store_phone text,
  social_facebook text,
  social_instagram text,
  delivery_zones jsonb default '[]'::jsonb,
  enable_pickup boolean default false,
  pickup_instructions text,
  tax_rate numeric default 0,
  enable_tax boolean default false,
  enable_stripe boolean default false,
  enable_paypal boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.pricing_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  rule_type text not null,
  condition_days numeric,
  price_adjustment_percent numeric,
  applies_to_category text,
  is_active boolean default true,
  priority numeric default 0,
  description text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.pricing_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  rule_id uuid references public.pricing_rules(id),
  old_price numeric not null,
  new_price numeric not null,
  reason text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. DROP ALL EXISTING POLICIES to avoid conflicts
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Products are viewable by everyone." on public.products;
drop policy if exists "Authenticated users can insert products." on public.products;
drop policy if exists "Authenticated users can update products." on public.products;
drop policy if exists "Authenticated users can delete products." on public.products;

drop policy if exists "Users can view their own orders." on public.orders;
drop policy if exists "Users can create their own orders." on public.orders;

drop policy if exists "Users can view their own order items." on public.order_items;
drop policy if exists "Users can create their own order items." on public.order_items;

drop policy if exists "Users can view their own settings" on public.store_settings;
drop policy if exists "Users can insert their own settings" on public.store_settings;
drop policy if exists "Users can update their own settings" on public.store_settings;

drop policy if exists "Authenticated users can view pricing rules" on public.pricing_rules;
drop policy if exists "Authenticated users can manage pricing rules" on public.pricing_rules;

drop policy if exists "Authenticated users can view pricing logs" on public.pricing_logs;
drop policy if exists "Authenticated users can create pricing logs" on public.pricing_logs;

-- 3. ENABLE RLS (Required for Supabase)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.transactions enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.suppliers enable row level security;
alter table public.store_settings enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.pricing_logs enable row level security;

-- 4. CREATE PERMISSIVE POLICIES (Allow authenticated users to do everything)
-- This allows the Seller to see ALL orders, not just their own.

-- Profiles
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Products & Suppliers (Public Read, Auth Write)
create policy "Products are viewable by everyone" on public.products for select using (true);
create policy "Auth users can manage products" on public.products for all using (auth.role() = 'authenticated');

create policy "Suppliers are viewable by everyone" on public.suppliers for select using (true);
create policy "Auth users can manage suppliers" on public.suppliers for all using (auth.role() = 'authenticated');

-- Orders (Auth users can see ALL orders - for Seller Dashboard)
create policy "Auth users can view all orders" on public.orders for select using (auth.role() = 'authenticated');
create policy "Auth users can create orders" on public.orders for insert with check (auth.role() = 'authenticated');
create policy "Auth users can update orders" on public.orders for update using (auth.role() = 'authenticated');

-- Order Items
create policy "Auth users can view all order items" on public.order_items for select using (auth.role() = 'authenticated');
create policy "Auth users can create order items" on public.order_items for insert with check (auth.role() = 'authenticated');

-- Transactions & Stock Adjustments
create policy "Auth users can view transactions" on public.transactions for select using (auth.role() = 'authenticated');
create policy "Auth users can create transactions" on public.transactions for insert with check (auth.role() = 'authenticated');

create policy "Auth users can view stock adjustments" on public.stock_adjustments for select using (auth.role() = 'authenticated');
create policy "Auth users can create stock adjustments" on public.stock_adjustments for insert with check (auth.role() = 'authenticated');

-- Settings
create policy "Auth users can view/manage settings" on public.store_settings for all using (auth.role() = 'authenticated');

-- Pricing
create policy "Auth users can view/manage pricing rules" on public.pricing_rules for all using (auth.role() = 'authenticated');
create policy "Auth users can view/manage pricing logs" on public.pricing_logs for all using (auth.role() = 'authenticated');
