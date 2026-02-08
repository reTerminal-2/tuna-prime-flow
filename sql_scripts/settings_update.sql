-- Update store_settings table with new fields
alter table public.store_settings add column if not exists store_address text;
alter table public.store_settings add column if not exists store_email text;
alter table public.store_settings add column if not exists store_phone text;
alter table public.store_settings add column if not exists social_facebook text;
alter table public.store_settings add column if not exists social_instagram text;

alter table public.store_settings add column if not exists delivery_zones jsonb default '[]'::jsonb;
alter table public.store_settings add column if not exists enable_pickup boolean default false;
alter table public.store_settings add column if not exists pickup_instructions text;

alter table public.store_settings add column if not exists tax_rate numeric default 0;
alter table public.store_settings add column if not exists enable_tax boolean default false;
alter table public.store_settings add column if not exists enable_stripe boolean default false;
alter table public.store_settings add column if not exists enable_paypal boolean default false;
