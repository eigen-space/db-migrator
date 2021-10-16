import { MigrationActionType } from '../enums/migration-action-type.enum';

export interface Migration {
    version: number;
    action: MigrationActionType;
    filename: string;
    name: string;
    md5: string;
    sql: string;
}