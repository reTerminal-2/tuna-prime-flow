-- Create pricing_rules table
create table public.pricing_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  rule_type text not null check (rule_type in ('expiration_based', 'age_based', 'demand_based', 'manual')),
  condition_days numeric,
  price_adjustment_percent numeric,
  applies_to_category text check (applies_to_category in ('fresh', 'frozen', 'canned', 'other')),
  is_active boolean default true,
  priority numeric default 0,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create pricing_logs table
create table public.pricing_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  rule_id uuid references public.pricing_rules(id),
  old_price numeric not null,
  new_price numeric not null,
  reason text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for pricing tables
alter table public.pricing_rules enable row level security;
create policy "Authenticated users can view pricing rules" on public.pricing_rules for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage pricing rules" on public.pricing_rules for all using (auth.role() = 'authenticated');

alter table public.pricing_logs enable row level security;
create policy "Authenticated users can view pricing logs" on public.pricing_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create pricing logs" on public.pricing_logs for insert with check (auth.role() = 'authenticated');
