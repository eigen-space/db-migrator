/* eslint-disable no-console */
import { Runner } from './runner/runner';
import { DbMigratorClient } from '@eigenspace/db-migrator-client';

const DEFAULT_ERROR_CODE = 255;

main()
    .then(() => console.log('everything is ok'))
    .catch(e => {
        console.error('something goes wrong');
        process.exit(e.code || DEFAULT_ERROR_CODE);
    });

async function main(): Promise<void> {
    const migrator = new DbMigratorClient();
    await migrator.migrate();

    const runner = new Runner();
    runner.run();
}