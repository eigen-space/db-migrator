export interface DbClient {
  query<R = UnknownRow>(query: SqlQuery): Promise<R[]>;
}

export type UnknownRow = unknown;

export interface MigrationConfig {
  changelogTable: string;
  validateChecksums?: boolean;
  changeSetsDirectory: string;
}

export interface Migration {
  version: Version;
  action: ActionType;
  filename: string;
  name: string;
  md5: Hash;
  sql: SqlQuery;
}

export enum ActionType {
  DO = 'do',
  UNDO = 'undo'
}

export type Version = number;
export type Hash = string;

export type SqlQuery = string;
