/* eslint-disable */
import { exec as execOrigin } from 'child_process';
import express from 'express';
import fileUpload from 'express-fileupload';
import { env } from './env/env';
import util from 'util';

const exec = util.promisify(execOrigin);

const app = express();

app.use(fileUpload());

app.get('/heartbeat', (_, res) => {
    res.json({ message: 'alive' });
});

app.post('/migrate', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400)
            .send({ message: 'No files were uploaded.' });
    }

    if (1 < Object.keys(req.files).length) {
        return res.status(400)
            .send({
                message: 'You should send only one file. ' +
                    'It should be an archive of the directory with change sets.'
            });
    }

    try {
        const file = req.files.changelog as fileUpload.UploadedFile;
        await file.mv(`${env.uploadDirectory}/${file.name}`);
        await migrate();
        res.send({ message: 'Migration is successfully completed!' });
    } catch (err) {
        return res.status(500)
            .send(err);
    }
});

app.listen(env.port, () => {
    console.log('listen', `db migrator is listening at http://localhost:${env.port}`);
});

async function migrate(): Promise<void> {
    await executeCommand('/opt/scripts/migrate.sh');
}

async function executeCommand(command: string): Promise<void> {
    console.log('execute the command:', command);

    const { stdout, stderr } = await exec(command);
    console.log('exec, stdout:', stdout);
    console.log('exec, stderr:', stderr);
}