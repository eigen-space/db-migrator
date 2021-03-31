/* eslint-disable */
import { exec as execOrigin } from 'child_process';
import express, { Response } from 'express';
import fileUpload from 'express-fileupload';
import { env } from './env/env';
import util from 'util';
import { RequestValidator } from './request-validator/request-validator';

const exec = util.promisify(execOrigin);
const requestValidator = new RequestValidator();

const app = express();

app.use(fileUpload({ createParentPath: true }));

app.get('/heartbeat', (_, res) => {
    res.json({ message: 'alive' });
});

app.post('/migrate/:service/:database', async (req, res) => {
    console.log('/migrate', 'params:', req.params);
    const { params, files } = req;

    try {
        requestValidator.validate({ params, files });
    } catch (e) {
        return sendResponse(res, 400, e);
    }

    try {
        const { service, database } = params;
        const file = req.files!.changelog as fileUpload.UploadedFile;
        await file.mv(`${env.uploadDirectory}/${service}/${file.name}`);
        await migrate(service, database);
        res.send({ message: 'Migration is successfully completed!' });
    } catch (e) {
        sendResponse(res, 500, e);
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

function sendResponse(res: Response, code: number, error: Error): Response {
    console.error('response', `code: ${code}, error:`, error);
    return res.status(code)
        .send(error);
}