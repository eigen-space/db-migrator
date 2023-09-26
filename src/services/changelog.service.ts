import type { DbClient, Hash, Migration, MigrationConfig, Version } from '../db-migrator.types';
import { ActionType } from '../db-migrator.types';

export class ChangelogService {
    constructor(private config: MigrationConfig, private db: DbClient) {
    }

    async init(): Promise<void> {
        const exists = await this.exists();
        if (!exists) {
            await this.create();
        }
    }

    async apply(migration: Migration): Promise<void> {
        await this.db.query(migration.sql);

        switch (migration.action) {
            case ActionType.DO:
                await this.db.query(`
                    insert into ${this.config.changelogTable} (version, name, md5, run_at)
                    values (${migration.version},
                            '${migration.name}',
                            '${migration.md5}',
                            '${new Date().toISOString().replace('T', ' ').replace('Z', '')}');
                `);
                break;
            case ActionType.UNDO:
                await this.db.query(`
                    delete
                    from ${this.config.changelogTable}
                    where version = ${migration.version};
                `);
                break;
            default:
                throw new Error(`Unexpected action type: ${migration.action}`);
        }
    }

    async getMd5(migration: Migration): Promise<Hash> {
        const [row] = await this.db.query<ChangelogRow>(`
            select md5
            from ${this.config.changelogTable}
            where version = ${migration.version};
        `);
        return row.md5;
    }

    /**
     * Gets the database version of the schema from the database,
     * otherwise 0 if no version has been run
     */
    async getDbVersion(): Promise<Version> {
        const [row] = await this.db.query<ChangelogRow>(`
            select version
            from ${this.config.changelogTable}
            order by version desc
            limit 1
        `);
        return row?.version ?? 0;
    }

    private async create(): Promise<void> {
        await this.db.query(`
            create table ${this.config.changelogTable} (
                version integer primary key,
                name    varchar,
                md5     varchar,
                run_at  timestamp
            );
        `);
    }

    private async exists(): Promise<boolean> {
        try {
            await this.db.query(`
               select *
               from ${this.config.changelogTable}
               limit 1
            `);
            return true;
        } catch (e) {
            return false;
        }
    }
}

interface ChangelogRow {
    version: Version;
    md5: Hash;
}
