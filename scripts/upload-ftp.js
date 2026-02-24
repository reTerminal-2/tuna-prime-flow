import * as ftp from 'basic-ftp';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Minimal .env loader if dotenv isn't a dependency
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            });
        }
    } catch (err) {
        console.warn('Could not load .env file:', err.message);
    }
}

loadEnv();

async function upload() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        const host = process.env.FTP_SERVER || process.env.FTP_HOST || "ftpupload.net";
        const user = process.env.FTP_USERNAME || process.env.FTP_USER || "if0_41108542";
        const password = process.env.FTP_PASSWORD || await question(`Enter FTP Password for ${user}: `);
        const remoteDir = process.env.FTP_DIR || "htdocs";

        rl.close();

        console.log(`Connecting to ${host}...`);
        await client.access({
            host: host,
            user: user,
            password: password,
            secure: false // InfinityFree often requires plain FTP or has issues with TLS
        });

        console.log(`Clearing remote ${remoteDir} folder...`);
        // We use ensureDir and then work inside it. 
        await client.ensureDir(remoteDir);
        await client.clearWorkingDir(); // This deletes everything in the current directory

        console.log('Uploading fresh dist folder contents...');
        await client.uploadFromDir("dist");

        console.log('Upload complete!');
    } catch (err) {
        console.error('Upload failed:', err);
    } finally {
        client.close();
        rl.close(); // Ensure rl is closed in case of error
    }
}

upload();
