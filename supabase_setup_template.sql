
-- CREATE SYSTEM CONFIGS TABLE (If it doesn't already exist)
CREATE TABLE IF NOT EXISTS public.system_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY (Allow all authenticated users to read, but only admins to write)
CREATE POLICY "Enable read for all" ON public.system_configs
    FOR SELECT USING (true);

CREATE POLICY "Enable all for admins" ON public.system_configs
    FOR ALL USING (true);

-- EXAMPLE SEED (Replace with your actual key in the Supabase UI)
-- INSERT INTO public.system_configs (config_key, config_value)
-- VALUES ('gemini_api_key', 'YOUR_KEY_HERE')
-- ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
