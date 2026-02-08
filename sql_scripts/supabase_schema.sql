-- Create public.profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create public.products table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sku text not null,
  category text check (category in ('fresh', 'frozen', 'canned', 'other')) not null,
  description text,
  unit_of_measure text not null,
  cost_price numeric not null,
  selling_price numeric not null,
  current_stock numeric not null default 0,
  reorder_level numeric default 0,
  supplier_id uuid, -- foreign key added later
  expiration_date date,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create public.suppliers table
create table public.suppliers (
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

-- Add foreign key to products for supplier
alter table public.products add constraint products_supplier_id_fkey foreign key (supplier_id) references public.suppliers(id);

-- Create public.transactions table (for basic sales/inventory tracking)
create table public.transactions (
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

-- Create public.stock_adjustments table
create table public.stock_adjustments (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  quantity numeric not null,
  adjustment_type text not null, -- 'add', 'deduct', 'sale', 'waste'
  reason text,
  adjusted_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create public.orders table (NEW: for e-commerce)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  status text not null check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount numeric not null,
  shipping_address text,
  payment_status text check (payment_status in ('pending', 'paid', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create public.order_items table (NEW: for e-commerce)
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity numeric not null,
  unit_price numeric not null,
  total_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create RLS policies (Basic Example - Adjust as needed)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

alter table public.products enable row level security;
create policy "Products are viewable by everyone." on public.products for select using (true);
create policy "Authenticated users can insert products." on public.products for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update products." on public.products for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete products." on public.products for delete using (auth.role() = 'authenticated');

-- Enable RLS for other tables similarly...
alter table public.orders enable row level security;
create policy "Users can view their own orders." on public.orders for select using (auth.uid() = user_id);
create policy "Users can create their own orders." on public.orders for insert with check (auth.uid() = user_id);

alter table public.order_items enable row level security;
create policy "Users can view their own order items." on public.order_items for select using (
  exists ( select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid() )
);
create policy "Users can create their own order items." on public.order_items for insert with check (
  exists ( select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid() )
);
