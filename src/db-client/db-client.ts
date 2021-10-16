import { MigrationConfig } from '../types/migration-config';
import { Migration } from '../types/migration';
import { MigrationActionType } from '../enums/migration-action-type.enum';
import { QueryResult } from './query-result';

export abstract class DbClient<MC extends MigrationConfig> {

    protected constructor(protected readonly config: MC) {
    }

    async persistAction(migration: Migration): Promise<void> {
        let query: SqlQuery;
        switch (migration.action) {
            case MigrationActionType.DO:
                query = `
                    insert into ${this.config.changelogTable} (version, name, md5, run_at)
                    values (${migration.version},
                            '${migration.name}',
                            '${migration.md5}',
                            '${new Date().toISOString().replace('T', ' ').replace('Z', '')}');
                `;
                break;
            case MigrationActionType.UNDO:
                query = `
                    delete
                    from ${this.config.changelogTable}
                    where version = ${migration.version};
                `;
                break;
            default:
                throw new Error(`Unexpected action type: ${migration.action}`);
        }

        await this.runQuery(query);
    }

    async getMd5(migration: Migration): Promise<string> {
        const results = await this.runQuery(`
            select md5
            from ${this.config.changelogTable}
            where version = ${migration.version};
        `);
        return results.rows && results.rows[0] && results.rows[0].md5;
    }

    /**
     * Gets the database version of the schema from the database.
     * Otherwise 0 if no version has been run
     *
     * @returns {Promise} database schema version
     */
    async getDbVersion(): Promise<number> {
        const result = await this.runQuery(`
            select version
            from ${this.config.changelogTable}
            order by version desc
            limit 1
        `);
        return 0 < result.rows.length ? Number(result.rows[0].version) : 0;
    }

    async createChangelogTableIfNotExist(): Promise<void> {
        const results = await this.runQuery(this.getDoesChangelogTableExistQuery());
        const { rows } = results;

        const doesExist = Boolean(rows.length);
        if (!doesExist) {
            await this.runQuery(this.getCreateChangelogTableQuery());
        }
    }

    abstract runQuery(query: SqlQuery): Promise<QueryResult>;

    abstract connect(): Promise<void>;

    abstract disconnect(): Promise<void>;

    protected abstract getDoesChangelogTableExistQuery(): SqlQuery;

    protected abstract getCreateChangelogTableQuery(): SqlQuery;
}

export type SqlQuery = string;