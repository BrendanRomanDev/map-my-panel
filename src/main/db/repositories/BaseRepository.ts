import Database from 'better-sqlite3'

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  abstract create(input: CreateInput): T
  abstract findById(id: string): T | null
  abstract update(id: string, input: UpdateInput): T | null
  abstract delete(id: string): boolean

  protected mapTimestamps(row: any): any {
    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  protected parseJsonField(value: string): Record<string, unknown> {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
}
