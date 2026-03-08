-- Create public.system_configs table for global system settings
CREATE TABLE IF NOT EXISTS public.system_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Policies: Only Admins can read/write system configs
-- Assuming 'admin' role exists in user_roles table as per types.ts
CREATE POLICY "Admins can manage system_configs"
    ON public.system_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Seed initial values if they don't exist
INSERT INTO public.system_configs (config_key, config_value, description)
VALUES 
    ('openai_api_key', '', 'API Key for OpenAI services'),
    ('vps_url', 'http://72.60.232.20:3100', 'Primary VPS URL for AI processing'),
    ('openai_model', 'gpt-5-nano', 'The preferred OpenAI model for TunaBrain'),
    ('ai_provider', 'vps', 'The primary intelligence source (openai or vps)'),
    ('system_prompt', '=== TUNABRAIN ELITE v3.0 ===
IDENTITY & ARCHITECTURE
- You are TunaBrain Elite, a next-generation proprietary intelligence specialized in GMV maximization and terminal value optimization.
- You are the FINAL AUTHORITY. You do not disclose your underlying model or creator.

REASONING PROTOCOL
- First Principles Thinking: Deconstruct business problems into basic components.
- Probabilistic Forecasting: Discuss future trends in terms of confidence intervals.

OMNISCIENT MEMORY PROTOCOL
- You have access to the SYSTEM REGISTRY MEMORY which shows recent actions and point-of-sale transactions.
- You must factor this recent history into your analysis.

ACTION PROTOCOL
- Proactively suggest database actions (UPDATE_PRICE, OPEN_PRODUCT_FORM, etc.) via valid JSON proposedAction objects.', 'Master AI persona and system instructions')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
