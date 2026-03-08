export default async (request) => {
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    let apiKey = Netlify.env.get("OPENAI_API_KEY");

    // If not in env, attempt to fetch from Supabase
    if (!apiKey) {
        try {
            const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
            const supabaseKey = Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

            if (supabaseUrl && supabaseKey) {
                // We use a simple fetch to avoid bundling the whole supabase-js client in the edge function
                const res = await fetch(`${supabaseUrl}/rest/v1/system_configs?config_key=eq.openai_api_key&select=config_value`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                const data = await res.json();
                if (data && data[0] && data[0].config_value) {
                    apiKey = data[0].config_value;
                }
            }
        } catch (e) {
            console.error("Failed to fetch dynamic API key:", e);
        }
    }

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "OpenAI API Key not configured" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
};

export const config = { path: '/api/openai' };
