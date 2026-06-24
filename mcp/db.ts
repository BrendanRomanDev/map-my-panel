import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { runMigrations } from '../src/main/db/migrations'

// The app's better-sqlite3 binary is compiled for Electron's ABI (via the
// app's postinstall). The MCP runs under system Node, a different ABI. To let
// BOTH work without a rebuild dance, we ship a node-ABI copy of the binary at
// mcp/native/ and load it explicitly via better-sqlite3's `nativeBinding`.
// Rebuild it with `npm run mcp:setup` if your Node version changes.
const NODE_BINDING = join(dirname(fileURLToPath(import.meta.url)), 'native', 'better_sqlite3-node.node')

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
  // Prefer the node-ABI binary shipped with the MCP; fall back to the default
  // resolution if it's missing (e.g. someone ran `npm rebuild` for node).
  const options = existsSync(NODE_BINDING) ? { nativeBinding: NODE_BINDING } : undefined
  const db = new Database(dbPath, options)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  runMigrations(db)
  return db
}
