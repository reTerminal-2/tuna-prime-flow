const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/g4f', async (req, res) => {
    try {
        console.log('Proxying request for model:', req.body.model);

        const response = await fetch('https://api.g4f.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('API Error:', response.status, errText);
            return res.status(response.status).json({ error: errText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 6969;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`TunaFlow AI Local Proxy running on http://localhost:${PORT}`);
    console.log(`Set g4f_vm_url in your browser to: http://localhost:${PORT}`);
});
