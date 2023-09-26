import crypto from 'crypto';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import { ActionType } from './db-migrator.types';
import type { DbClient, Migration, MigrationConfig } from './db-migrator.types';
import { ChangelogService } from './services/changelog.service';

export class DbMigrator {
    private static DEFAULT_CONFIG: MigrationConfig = {
        changelogTable: 'dbchangelog',
        validateChecksums: true,
        changeSetsDirectory: './db/changesets'
    };
    private static MIGRATION_SCRIPT_EXTENSIONS = ['.sql'];
    private static MAX_VERSION_NAMES = ['max', ''];

    private readonly config: MigrationConfig = DbMigrator.DEFAULT_CONFIG;
    private readonly changelog: ChangelogService;

    protected constructor(config: MigrationConfig, db: DbClient) {
        this.config = Object.assign(this.config, config);
        this.changelog = new ChangelogService(config, db);
    }

    /**
     * Main method to move a schema to a particular version.
     * A target must be specified, otherwise nothing is run.
     *
     * @param version Version to migrate as string or number
     *  (handled as  numbers internally)
     */
    async migrate(version: string = ''): Promise<Migration[]> {
        try {
            await this.changelog.init();

            const migrations = await this.getMigrations();

            let targetVersion = Number(version);
            if (DbMigrator.MAX_VERSION_NAMES.includes(version.toLowerCase().trim())) {
                targetVersion = await this.getMaxVersion(migrations);
            }

            const databaseVersion = await this.changelog.getDbVersion();
            if (this.config.validateChecksums && databaseVersion <= targetVersion) {
                await this.validateMigrations(databaseVersion, migrations);
            }

            const runnableMigrations = await this.getRunnableMigrations(databaseVersion, targetVersion, migrations);
            return this.runMigrations(runnableMigrations);
        } catch (error) {
            // Decorate error with empty appliedMigrations if not yet exist
            // Rethrow error to module user
            if (!error.appliedMigrations) {
                error.appliedMigrations = [];
            }

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

                const migration: Migration = {
                    version: Number(rawVersion),
                    action: action as ActionType,
                    filename: file,
                    name,
                    md5: this.calculateChecksum(fileContent),
                    sql: fileContent
                };

                return migration;
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
            return migration.action === ActionType.DO
                && 0 < migration.version
                && migration.version <= databaseVersion;
        });

        for (const migration of migrationsToValidate) {
            const md5 = await this.changelog.getMd5(migration);
            if (migration.md5 !== md5) {
                throw new Error(`MD5 checksum failed for migration [${migration.version}]`);
            }
        }
    }

    /**
     * Runs the migrations in the order to reach target version
     *
     * @param migrations Migration objects we want to apply to database
     * @returns Applied migrations
     */
    private async runMigrations(migrations: Migration[] = []): Promise<Migration[]> {
        const appliedMigrations = [];

        try {
            for (const migration of migrations) {
                await this.changelog.apply(migration);
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
     * based on the current and target versions passed.
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
                return migration.action === ActionType.DO
                    && databaseVersion < migration.version
                    && migration.version <= targetVersion;
            });
            runnableMigrations.sort((a, b) => a.version - b.version);
        } else {
            runnableMigrations = migrations.filter(migration => {
                return migration.action === ActionType.UNDO
                    && migration.version <= databaseVersion
                    && targetVersion < migration.version;
            });
            runnableMigrations.sort((a, b) => b.version - a.version);
        }

        return runnableMigrations;
    }
}

type MigrationKey = string;
