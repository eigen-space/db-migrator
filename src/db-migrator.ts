import { MigrationConfig } from './types/migration-config';
import { Migration } from './types/migration';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { DbClient } from './db-client/db-client';
import { MigrationActionType } from './enums/migration-action-type.enum';
import path from 'path';
import crypto from 'crypto';

export abstract class DbMigrator<MC extends MigrationConfig, C extends DbClient<MC>> {
    private static DEFAULT_CONFIG: MigrationConfig = {
        host: '',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
        changelogTable: 'dbchangelog',
        validateChecksums: true,
        changeSetsDirectory: './db/changesets'
    };

    private static MIGRATION_SCRIPT_EXTENSIONS = ['.sql'];

    private static MAX_VERSION_NAMES = ['max', ''];

    protected readonly config: MigrationConfig = DbMigrator.DEFAULT_CONFIG;

    protected constructor(
        config: MigrationConfig,
        protected readonly client: C
    ) {
        this.config = Object.assign(this.config, config);
    }

    /**
     * Main method to move a schema to a particular version.
     * A target must be specified, otherwise nothing is run.
     *
     * @returns {Promise}
     * @param {String} version Version to migrate as string or number
     *  (handled as  numbers internally)
     */
    async migrate(version: string = ''): Promise<Migration[]> {
        const { client, config } = this;

        try {
            await client.connect();
            await client.createChangelogTableIfNotExist();

            const migrations = await this.getMigrations();

            let targetVersion = Number(version);
            if (DbMigrator.MAX_VERSION_NAMES.includes(version.toLowerCase().trim())) {
                targetVersion = await this.getMaxVersion(migrations);
            }

            const databaseVersion = await this.client.getDbVersion();
            if (config.validateChecksums && databaseVersion <= targetVersion) {
                await this.validateMigrations(databaseVersion, migrations);
            }

            const runnableMigrations = await this.getRunnableMigrations(databaseVersion, targetVersion, migrations);
            const appliedMigrations = await this.runMigrations(runnableMigrations);

            // We do it in try and catch blocks because
            // when we use it in the block `finally`
            // it is accidentally called after a random await.
            await client.disconnect();

            return appliedMigrations;
        } catch (error) {
            // Decorate error with empty appliedMigrations if not yet exist
            // Rethrow error to module user
            if (!error.appliedMigrations) {
                error.appliedMigrations = [];
            }
            await client.disconnect();

            throw error;
        }
    }

    /**
     * Reads all migrations from directory
     */
    private async getMigrations(): Promise<Migration[]> {
        const { changeSetsDirectory } = this.config;

        // eslint-disable-next-line no-console
        console.log('the directory with change sets:', path.resolve(changeSetsDirectory));
        const changeSets = await readdir(changeSetsDirectory);

        let migrations = changeSets
            .filter(file => DbMigrator.MIGRATION_SCRIPT_EXTENSIONS.includes(path.extname(file)))
            .map(file => {
                const basename = path.basename(file);
                const ext = path.extname(basename);

                const basenameNoExt = path.basename(file, ext);
                const [rawVersion, action, name = ''] = basenameNoExt.split('.');

                const filename = path.join(changeSetsDirectory, file);
                const fileContent = readFileSync(filename, 'utf8');

                return {
                    version: Number(rawVersion),
                    action,
                    filename: file,
                    name,
                    md5: this.calculateChecksum(fileContent),
                    sql: fileContent
                } as Migration;
            });

        migrations = migrations.filter(migration => !isNaN(migration.version));

        const migrationKeys = new Set<MigrationKey>();

        migrations.forEach(migration => {
            const newKey = `${migration.version}:${migration.action}`;
            if (migrationKeys.has(newKey)) {
                throw new Error(
                    `Two migrations found with version ${migration.version} and action ${migration.action}`
                );
            }
            migrationKeys.add(newKey);
        });

        return migrations;
    }

    // noinspection JSMethodCanBeStatic
    private async getMaxVersion(migrations: Migration[]): Promise<number> {
        const versions = migrations.map(migration => migration.version);
        return Math.max.apply(null, versions);
    }

    // noinspection JSMethodCanBeStatic
    /**
     * Calculate checksum of file to detect changes to migrations that have already run.
     */
    private calculateChecksum(content: string): string {
        return crypto.createHash('md5')
            .update(content, 'utf8')
            .digest('hex');
    }

    /**
     * Validate md5 checksums for applied migrations
     */
    private async validateMigrations(databaseVersion: number, migrations: Migration[]): Promise<void> {
        const migrationsToValidate = migrations.filter(migration => {
            return migration.action === MigrationActionType.DO
                && 0 < migration.version
                && migration.version <= databaseVersion;
        });

        for (const migration of migrationsToValidate) {
            const md5 = await this.client.getMd5(migration);
            if (migration.md5 !== md5) {
                throw new Error(`MD5 checksum failed for migration [${migration.version}]`);
            }
        }
    }

    /**
     * Runs the migrations in the order to reach target version
     *
     * @returns {Promise} - Array of migration objects to appled to database
     * @param {Array} migrations - Array of migration objects to apply to database
     */
    private async runMigrations(migrations: Migration[] = []): Promise<Migration[]> {
        const appliedMigrations = [];

        try {
            for (const migration of migrations) {
                await this.client.runQuery(migration.sql);
                await this.client.persistAction(migration);
                appliedMigrations.push(migration);
            }
        } catch (error) {
            // FIXME Filter the sql field
            error.appliedMigrations = appliedMigrations;
            throw error;
        }

        return appliedMigrations;
    }

    /**
     * Returns an array of relevant migrations
     * based on the target and database version passed.
     * returned array is sorted in the order it needs to be run
     */
    private async getRunnableMigrations(
        databaseVersion: number,
        targetVersion: number,
        migrations: Migration[]
    ): Promise<Migration[]> {
        let runnableMigrations: Migration[];

        if (databaseVersion <= targetVersion) {
            runnableMigrations = migrations.filter(migration => {
                return migration.action === MigrationActionType.DO
                    && databaseVersion < migration.version
                    && migration.version <= targetVersion;
            });
            runnableMigrations.sort((a, b) => a.version - b.version);
        } else {
            runnableMigrations = migrations.filter(migration => {
                return migration.action === MigrationActionType.UNDO
                    && migration.version <= databaseVersion
                    && targetVersion < migration.version;
            });
            runnableMigrations.sort((a, b) => b.version - a.version);
        }

        return runnableMigrations;
    }
}

type MigrationKey = string;