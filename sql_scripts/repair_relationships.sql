-- ==============================================================================
-- REPAIR SCRIPT: Fix Foreign Keys, Create Missing Profiles, and Open Permissions
-- ==============================================================================

-- 1. SYNC PROFILES (Crucial: Ensure every user has a profile)
-- This fixes issues where joins fail because the user exists in Auth but not in Public schema
insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;

-- 2. FIX ORDERS FOREIGN KEY
-- Change orders.user_id to reference public.profiles instead of auth.users
-- This allows the frontend "profiles:user_id" join to work automatically
alter table public.orders
  drop constraint if exists orders_user_id_fkey;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- 3. FIX PRODUCTS FOREIGN KEY (Optional but recommended for consistency)
alter table public.products
  drop constraint if exists products_user_id_fkey;

alter table public.products
  add constraint products_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

-- 4. ENSURE ALL TABLES EXIST (Double Check)
create table if not exists public.store_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  store_name text,
  currency text default 'PHP'
);

-- 5. GRANT PERMISSIONS (Fix "Permission Denied" errors)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

-- 6. RESET RLS TO "OPEN MODE" (Fix "Failed to load" due to policy)
-- We drop existing policies to avoid conflicts and ensure fresh start

-- Helper function to drop policies for a table
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Enable read access for all users" on %I', t);
    execute format('drop policy if exists "Enable insert for authenticated users" on %I', t);
    execute format('drop policy if exists "Enable update for authenticated users" on %I', t);
    execute format('drop policy if exists "Enable delete for authenticated users" on %I', t);
    
    -- Create Broad Permissive Policies
    execute format('create policy "Enable read access for all users" on %I for select using (true)', t);
    execute format('create policy "Enable insert for authenticated users" on %I for insert with check (auth.role() = ''authenticated'')', t);
    execute format('create policy "Enable update for authenticated users" on %I for update using (auth.role() = ''authenticated'')', t);
    execute format('create policy "Enable delete for authenticated users" on %I for delete using (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

-- 7. Specific fix for Settings (Upsert often fails if no RLS allows update)
drop policy if exists "Enable insert for authenticated users" on public.store_settings;
create policy "Enable insert/update for auth users" on public.store_settings for all using (auth.role() = 'authenticated');
