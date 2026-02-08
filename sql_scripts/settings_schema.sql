-- Create public.store_settings table
create table public.store_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  store_name text,
  store_description text,
  logo_url text,
  currency text default 'PHP',
  
  -- Notification Preferences
  notify_low_stock boolean default true,
  notify_expiring boolean default true,
  notify_new_order boolean default true,
  
  -- Inventory Settings
  stock_alert_days integer default 7,
  
  -- E-commerce Configuration
  enable_cod boolean default true,
  enable_shipping boolean default true,
  shipping_fee numeric default 0,
  min_order_amount numeric default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table public.store_settings enable row level security;

create policy "Users can view their own settings" 
  on public.store_settings for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own settings" 
  on public.store_settings for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own settings" 
  on public.store_settings for update 
  using (auth.uid() = user_id);
