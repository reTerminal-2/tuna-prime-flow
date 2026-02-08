-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create Enums
create type app_role as enum ('admin', 'user');
create type product_category as enum ('fresh', 'frozen', 'canned', 'other');
create type rule_type as enum ('expiration_based', 'age_based', 'demand_based', 'manual');

-- Create Tables

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid not null -- redundant but useful for joins sometimes, though id is usually enough
);

-- 2. User Roles
create table user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role app_role default 'user',
  created_at timestamptz default now(),
  unique(user_id)
);

-- 3. Suppliers
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  user_id uuid references auth.users on delete set null, -- The seller who owns this supplier record
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Products
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sku text not null,
  category product_category not null,
  description text,
  cost_price numeric not null default 0,
  selling_price numeric not null default 0,
  current_stock integer not null default 0,
  reorder_level integer default 10,
  unit_of_measure text not null default 'unit',
  expiration_date date,
  supplier_id uuid references suppliers(id) on delete set null,
  user_id uuid references auth.users on delete cascade, -- The seller who owns this product
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Transactions (Orders/Sales)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete set null,
  quantity integer not null,
  unit_price numeric not null,
  total_amount numeric not null,
  cost_price numeric not null default 0,
  profit numeric not null default 0,
  transaction_date timestamptz default now(),
  notes text,
  created_by uuid references auth.users on delete set null -- The user (buyer or seller) who created it
);

-- 6. Pricing Rules (Engine)
create table pricing_rules (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  rule_type rule_type not null,
  applies_to_category product_category,
  condition_days integer, -- e.g. days until expiration
  price_adjustment_percent numeric, -- e.g. -10 for 10% off
  priority integer default 0,
  is_active boolean default true,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Pricing Logs (Audit trail)
create table pricing_logs (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade,
  rule_id uuid references pricing_rules(id) on delete set null,
  old_price numeric not null,
  new_price numeric not null,
  reason text,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

-- 8. Stock Adjustments (Manual changes)
create table stock_adjustments (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade,
  quantity integer not null, -- positive to add, negative to remove
  reason text,
  adjustment_type text, -- 'manual', 'damage', 'correction'
  adjusted_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table pricing_rules enable row level security;
alter table pricing_logs enable row level security;
alter table stock_adjustments enable row level security;

-- Policies

-- Profiles: Public read (for "Sold by"), User update own
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- User Roles: Read own, Insert own
create policy "Users can read own role" on user_roles for select using (auth.uid() = user_id);
create policy "Users can insert own role" on user_roles for insert with check (auth.uid() = user_id);

-- Products: Public read, Seller full access to own
create policy "Public Read Products" on products for select using (true);
create policy "Sellers can insert own products" on products for insert with check (auth.uid() = user_id);
create policy "Sellers can update own products" on products for update using (auth.uid() = user_id);
create policy "Sellers can delete own products" on products for delete using (auth.uid() = user_id);
-- Also allow anyone to update stock (e.g. during checkout)? Ideally this is via RPC, but for now:
-- Better: Use a function for stock decrement to avoid giving update permission to buyers on products.
-- But for the sake of the 'Cart.tsx' implementation which might try to update directly if RPC fails:
-- We'll allow authenticated users to update 'current_stock' only... 
-- Actually, let's rely on the RPC function which bypasses RLS if defined as 'security definer'.

-- Suppliers: Seller full access to own
create policy "Sellers can view own suppliers" on suppliers for select using (auth.uid() = user_id);
create policy "Sellers can insert own suppliers" on suppliers for insert with check (auth.uid() = user_id);
create policy "Sellers can update own suppliers" on suppliers for update using (auth.uid() = user_id);
create policy "Sellers can delete own suppliers" on suppliers for delete using (auth.uid() = user_id);

-- Transactions: 
-- Buyers can insert (create order)
create policy "Buyers can create orders" on transactions for insert with check (auth.uid() = created_by);
-- Buyers can view their own orders
create policy "Buyers can view own orders" on transactions for select using (auth.uid() = created_by);
-- Sellers can view orders containing their products?
-- This is tricky with RLS on 'product_id'. We need a join. 
-- Simple version: Sellers can view all transactions? No.
-- For now, let's allow users to see their own transactions.
-- And Sellers need to see transactions for THEIR products.
-- This requires a complex policy: 
-- create policy "Sellers see orders for their products" on transactions for select using (
--   exists (select 1 from products where products.id = transactions.product_id and products.user_id = auth.uid())
-- );
-- Let's add that.
create policy "Sellers see orders for their products" on transactions for select using (
  exists (select 1 from products where products.id = transactions.product_id and products.user_id = auth.uid())
);

-- Functions and Triggers

-- Handle New User (Auto-create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, user_id)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.id);
  
  -- Also handle role if passed in metadata
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'user'));
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Decrement Stock Function (RPC)
create or replace function decrement_stock(p_id uuid, q int)
returns void as $$
begin
  update products
  set current_stock = current_stock - q
  where id = p_id;
end;
$$ language plpgsql security definer;
