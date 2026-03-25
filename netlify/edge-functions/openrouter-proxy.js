export default async (request) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();

        // Hardcoded fallback API key if none provided
        const OPENROUTER_KEY = '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';
        const authHeader = request.headers.get('Authorization') || `Bearer ${OPENROUTER_KEY}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'HTTP-Referer': 'https://tunaflow.netlify.app',
                'X-Title': 'TunaFlow V2',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = { path: '/api/openrouter' };
