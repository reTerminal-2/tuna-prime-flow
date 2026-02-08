-- Fix for RLS Policies blocking public access

-- 1. Drop existing conflicting policies if they exist (to be safe)
drop policy if exists "Public Read Products" on products;
drop policy if exists "Public Read Profiles" on profiles;
drop policy if exists "Products are viewable by everyone" on products;
drop policy if exists "Public profiles are viewable by everyone" on profiles;

-- 2. Create the policies requested
create policy "Public Read Products" on products for select to public using (true);
create policy "Public Read Profiles" on profiles for select to public using (true);

-- 3. Ensure RLS is enabled (otherwise policies don't matter, but good to have)
alter table products enable row level security;
alter table profiles enable row level security;
