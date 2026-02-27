import { spawn } from 'child_process';
import fs from 'fs';

const relayCode = fs.readFileSync('e:\\TunaFlow V2\\TunaFlowV2\\vps\\relay.js', 'utf8');
const password = 'Programming123';
const host = '72.60.232.20';

async function runDeploy() {
    console.log('🚀 Starting deployment to VPS...');

    // Command to write the file on the VPS
    // We use base64 to avoid escaping issues
    const b64 = Buffer.from(relayCode).toString('base64');
    const command = `mkdir -p /root/tunaflow && echo "${b64}" | base64 -d > /root/tunaflow/relay.js && nohup node /root/tunaflow/relay.js > /root/tunaflow/relay.log 2>&1 &`;

    const ssh = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', `root@${host}`, command]);

    ssh.stdout.on('data', (data) => {
        const out = data.toString();
        console.log('[STDOUT]', out);
        if (out.toLowerCase().includes('password:')) {
            console.log('🔑 Password prompt detected, sending password...');
            ssh.stdin.write(password + '\n');
        }
    });

    ssh.stderr.on('data', (data) => {
        const err = data.toString();
        console.log('[STDERR]', err);
        if (err.toLowerCase().includes('password:')) {
            console.log('🔑 Password prompt detected in stderr, sending password...');
            ssh.stdin.write(password + '\n');
        }
    });

    ssh.on('close', (code) => {
        console.log(`✅ deployment process finished with code ${code}`);
    });
}

runDeploy();
