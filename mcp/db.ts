import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { runMigrations } from '../src/main/db/migrations'

// Resolves the Electron app's SQLite DB path (the same file the desktop app
// reads/writes). Electron uses app.getPath('userData'); we replicate that per
// platform. Override with MAP_MY_PANEL_DB for tests or a non-default location.
export function resolveDbPath(): string {
  if (process.env.MAP_MY_PANEL_DB) return process.env.MAP_MY_PANEL_DB

  const home = homedir()
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'map-my-panel', 'map-my-panel.db')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'map-my-panel', 'map-my-panel.db')
    default:
      return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'map-my-panel', 'map-my-panel.db')
  }
}

// Opens the app DB with the same pragmas the app uses, and runs migrations so
// the MCP and app are always on the same schema. Throws if the DB file doesn't
// exist yet (the app must have been launched at least once to create it).
export function openDatabase(): Database.Database {
  const dbPath = resolveDbPath()
  if (!existsSync(dbPath) && !process.env.MAP_MY_PANEL_DB) {
    throw new Error(
      `Map My Panel database not found at ${dbPath}. Launch the desktop app at least once to create it.`
    )
  }
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  runMigrations(db)
  return db
}
