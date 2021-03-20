/* eslint-disable */
import { Pool } from 'pg';
import * as fs from 'fs';
import FormData from 'form-data';
import { promisify } from 'util';

export class DbMigratorClient {
    private static GENERAL_DB = 'postgres';
    private static SLEEP_INTERVAL = 30 * 1000;
    private static CHANGELOG_FILENAME = './changelog.tar';

    private readonly generalDbConfig: DbConfig;
    private readonly generalDbPool: Pool;

    private readonly database: string;
    private readonly service: string;
    private readonly migratorConfig: MigratorConfig = {
        urls: {
            baseUrl: '',
            migrate: '/migrate/:service/:database'
        }
    };

    constructor(options: DbMigratorClientOptions) {
        this.service = options.service;
        this.database = options.db.database;
        this.migratorConfig.urls.baseUrl = options.migratorBaseUrl;
        // The idea is that there might be no the database for the service
        // and we should create it at first
        this.generalDbConfig = {
            ...options.db,
            database: DbMigratorClient.GENERAL_DB
        };
        this.generalDbPool = new Pool(this.generalDbConfig);
    }

    async waitForStorageUpAndRunning(): Promise<void> {
        const healthCheckQuery = 'select * from information_schema.tables';

        return new Promise(async (resolve) => {
            try {
                console.log('Check the storage is up and running...');
                await this.generalDbPool.query(healthCheckQuery);
                console.log('The storage is ready');

                resolve();
            } catch (e) {
                const sleepInterval = DbMigratorClient.SLEEP_INTERVAL;
                console.warn(`The storage is not ready yet. Wait ${sleepInterval / 1000}s`);
                setTimeout(
                    async () => {
                        await this.waitForStorageUpAndRunning();
                        resolve();
                    },
                    sleepInterval
                );
            }
        });
    }

    async createDatabase(): Promise<void> {
        const isDbExist = await this.isDatabaseExist();
        if (isDbExist) {
            return;
        }

        console.log(`Create the database: '${this.database}'`);
        const createDbQuery = `create database ${this.database};`;
        await this.generalDbPool.query(createDbQuery);
        console.log(`Database '${this.database}' is successfully created`);
    }

    private async isDatabaseExist(): Promise<boolean> {
        console.log(`Check whether the database ${this.database} already exists`);

        const checkQuery = `select * from pg_database where datname = '${this.database}'`;
        const result = await this.generalDbPool.query(checkQuery);
        const isExist = Boolean(result.rows.length);

        let message = `There is no a database with the name '${this.database}'`;
        if (isExist) {
            message = `Database '${this.database}' already exists`;
        }
        console.log(message);

        return isExist;
    }

    async migrate(changeLogFilename = DbMigratorClient.CHANGELOG_FILENAME): Promise<void> {
        console.log('Migration is started');

        const { baseUrl, migrate } = this.migratorConfig.urls;
        const url = `${baseUrl}${migrate}`.replace(':service', this.service)
            .replace(':database', this.database);

        const form = new FormData();
        form.append('changelog', fs.createReadStream(changeLogFilename));
        const submit = promisify(form.submit.bind(form));
        await submit(url);
        console.log('Migration is successfully completed');
    }
}

export interface DbMigratorClientOptions {
    service: string;
    migratorBaseUrl: string;
    db: DbConfig;
}

export interface MigratorConfig {
    urls: {
        baseUrl: string;
        migrate: string;
    }
}

export interface DbConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}