-- Seeding Pollinations AI API Key
INSERT INTO system_configs (config_key, config_value)
VALUES 
    ('pollinations_api_key', 'sk_v8iOhbSQfwkUd4kQUpIHZTEMwJLJsBmu'),
    ('ai_provider', 'gemini'),
    ('openai_model', 'gemini-fast')
ON CONFLICT (config_key)
DO UPDATE SET config_value = EXCLUDED.config_value;
