import * as ftp from 'basic-ftp';
import * as readline from 'readline';

async function upload() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        const password = await question('Enter FTP Password for if0_41108542: ');
        rl.close();

        console.log('Connecting to ftpupload.net...');
        await client.access({
            host: "ftpupload.net",
            user: "if0_41108542",
            password: password,
            secure: false
        });

        console.log('Clearing remote htdocs folder...');
        // Be careful with clearWorkingDir, ensures we upload fresh.
        // Or just upload and overwrite.
        await client.ensureDir("htdocs");
        await client.clearWorkingDir();

        console.log('Uploading dist folder...');
        await client.uploadFromDir("dist");

        console.log('Upload complete!');
    } catch (err) {
        console.error('Upload failed:', err);
    } finally {
        client.close();
    }
}

upload();
