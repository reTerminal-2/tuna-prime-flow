const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const relayPath = path.join(__dirname, '..', 'vps', 'relay.js');
const relayCode = fs.readFileSync(relayPath, 'utf8');
const password = 'Programming123';
const host = '72.60.232.20';

const b64 = Buffer.from(relayCode).toString('base64');
const command = `pkill -f g4f || true; nohup g4f api --cors '*' --host 0.0.0.0 --port 1337 > /root/g4f.log 2>&1 & echo "CORS_ENABLED_SUCCESS"`;

console.log('--- STARTING DEPLOYMENT ---');

const ssh = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', `root@${host}`, command]);

// Blind send after 2 seconds just in case prompt is hidden
setTimeout(() => {
    console.log('--- Blindly sending password... ---');
    ssh.stdin.write(password + '\n');
}, 3000);

ssh.stdout.on('data', (data) => {
    const out = data.toString();
    console.log(out);
    if (out.toLowerCase().includes('password')) {
        ssh.stdin.write(password + '\n');
    }
});

ssh.stderr.on('data', (data) => {
    const err = data.toString();
    console.error(err);
    if (err.toLowerCase().includes('password')) {
        ssh.stdin.write(password + '\n');
    }
});

ssh.on('close', (code) => {
    console.log('--- DONE (code: ' + code + ') ---');
});
