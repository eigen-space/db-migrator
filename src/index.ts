/* eslint-disable */
import { exec as execOrigin } from 'child_process';
import express from 'express';
import fileUpload from 'express-fileupload';
import { env } from './env/env';
import util from 'util';

const exec = util.promisify(execOrigin);

const app = express();

app.use(fileUpload({ createParentPath: true }));

app.get('/heartbeat', (_, res) => {
    res.json({ message: 'alive' });
});

app.post('/migrate/:service/:database', async (req, res) => {
    console.log('/migrate', 'params:', req.params);
    const { service, database } = req.params;

    if (!service) {
        return res.status(400)
            .send({ message: 'You should specify the name of service which is going to migrate db.' });
    }

    if (!database) {
        return res.status(400)
            .send({ message: 'You should specify the database name you want to migrate.' });
    }

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
        await file.mv(`${env.uploadDirectory}/${service}/${file.name}`);
        await migrate(service, database);
        res.send({ message: 'Migration is successfully completed!' });
    } catch (err) {
        return res.status(500)
            .send(err);
    }
});

app.listen(env.port, () => {
    console.log('listen', `db migrator is listening at http://localhost:${env.port}`);
});

async function migrate(service: string, database: string): Promise<void> {
    await executeCommand(`/opt/scripts/migrate.sh ${service} ${database}`);
}

async function executeCommand(command: string): Promise<void> {
    console.log('execute the command:', command);

    const { stdout, stderr } = await exec(command);
    console.log('exec, stdout:', stdout);
    console.log('exec, stderr:', stderr);
}