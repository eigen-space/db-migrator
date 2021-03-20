import { DbConfig, DbMigratorClient } from '../db-migrator-client/db-migrator-client';

const {
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME,
    CHANGELOG_FILENAME
} = process.env;

const dbConfig: DbConfig = {
    host: DB_HOST || 'localhost',
    port: Number(DB_PORT) || 5432,
    user: DB_USERNAME || 'postgres',
    password: DB_PASSWORD || 'postgres',
    database: DB_NAME || 'example_service'
};

const config = {
    service: 'example-service',
    migratorBaseUrl: 'http://localhost:4010',
    db: dbConfig
};

const migratorClient = new DbMigratorClient(config);

export async function migrate(changeLogFilename = CHANGELOG_FILENAME): Promise<void> {
    await migratorClient.waitForStorageUpAndRunning();
    await migratorClient.createDatabase();
    await migratorClient.migrate(changeLogFilename);
}
