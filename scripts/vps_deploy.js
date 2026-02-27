import { spawn } from 'child_process';

const host = '72.60.232.20';
const user = 'root';
const pass = 'Programming123';

function runSsh(command) {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', `${user}@${host}`, command]);
        let output = '';
        let error = '';

        ssh.stdout.on('data', (data) => {
            output += data.toString();
            console.log('STDOUT:', data.toString());
        });

        ssh.stderr.on('data', (data) => {
            const msg = data.toString();
            error += msg;
            console.log('STDERR:', msg);
            if (msg.toLowerCase().includes('password')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Exit code ${code}: ${error}`));
        });
    });
}

async function main() {
    try {
        console.log('Checking VPS...');
        const uname = await runSsh('uname -a');
        console.log('VPS OS:', uname);

        console.log('Deploying relay...');
        // 1. Create directory
        await runSsh('mkdir -p /root/tunaflow-relay');

        // 2. Transfer files (since scp is hard, we can use base64 + dd)
        // Relay.js
        const relayContent = `// TunaFlow AI Relay Service
// Sits between the chatbot UI and GPT4Free.
// Browser \u2192 relay:3100 (CORS OK) \u2192 GPT4Free:1337 (Pollinations/gpt-4.1-nano) \u2192 back
const http = require('http');

const PORT = 3100;
const G4F_HOST = '127.0.0.1';
const G4F_PORT = 1337;
const MODEL = 'gpt-4.1-nano';
const PROVIDER = 'Pollinations';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    // Health check
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ status: 'ok', model: MODEL, provider: PROVIDER }));
        return;
    }

    // Only accept POST /chat
    if (req.method !== 'POST' || req.url !== '/chat') {
        res.writeHead(404, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Not found. Use POST /chat' }));
        return;
    }

    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    req.on('end', () => {
        let userPayload;
        try {
            userPayload = JSON.parse(rawBody);
        } catch {
            res.writeHead(400, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
        }

        if (!userPayload.messages || !Array.isArray(userPayload.messages)) {
            res.writeHead(400, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'messages array required' }));
            return;
        }

        // Build G4F payload \u2014 hardcoded to Pollinations + model
        const g4fPayload = JSON.stringify({
            model: MODEL,
            provider: PROVIDER,
            messages: userPayload.messages,
            stream: false
        });

        const options = {
            hostname: G4F_HOST,
            port: G4F_PORT,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(g4fPayload)
            }
        };

        const startTime = Date.now();
        const g4fReq = http.request(options, (g4fRes) => {
            let data = '';
            g4fRes.on('data', chunk => data += chunk);
            g4fRes.on('end', () => {
                const elapsed = Date.now() - startTime;
                console.log(\`[Relay] \${new Date().toISOString()} - \${elapsed}ms - status \${g4fRes.statusCode}\`);
                res.writeHead(g4fRes.statusCode, CORS_HEADERS);
                res.end(data);
            });
        });

        g4fReq.setTimeout(45000, () => {
            g4fReq.destroy();
            res.writeHead(504, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Gateway timeout: G4F took too long' }));
        });

        g4fReq.on('error', (e) => {
            console.error('[Relay] G4F error:', e.message);
            res.writeHead(502, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Could not reach GPT4Free: ' + e.message }));
        });

        g4fReq.write(g4fPayload);
        g4fReq.end();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(\`[Relay] TunaFlow AI Relay running on port \${PORT}\`);
    console.log(\`[Relay] Forwarding to GPT4Free at \${G4F_HOST}:\${G4F_PORT}\`);
    console.log(\`[Relay] Model: \${MODEL} | Provider: \${PROVIDER}\`);
});`;

        const b64 = Buffer.from(relayContent).toString('base64');
        await runSsh(`echo "${b64}" | base64 -d > /root/tunaflow-relay/relay.js`);
        console.log('Uploaded relay.js');

        // 3. Start it (using node directly for now, maybe pm2 if there)
        console.log('Starting relay...');
        await runSsh('kill $(lsof -t -i:3100) || true');
        await runSsh('nohup node /root/tunaflow-relay/relay.js > /root/tunaflow-relay/relay.log 2>&1 &');

        console.log('Deployment complete!');
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

main();
