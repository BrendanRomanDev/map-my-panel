import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'map-my-panel.db')

    // Ensure the directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Set journal mode to WAL for better performance
    db.pragma('journal_mode = WAL')

    // Run migrations
    runMigrations(db)
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Re-exported for tests and callers that only need the migration runner
// (importing it from here would pull in electron's `app`; import from
// './migrations' directly in node-only contexts like tests).
export { runMigrations }
