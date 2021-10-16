export interface MigrationConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    changelogTable: string;
    validateChecksums?: boolean;
    changeSetsDirectory: string;
}