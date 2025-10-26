import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

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

function runMigrations(database: Database.Database): void {
  // Create migrations table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Get list of applied migrations
  const appliedMigrations = database
    .prepare('SELECT name FROM migrations')
    .all()
    .map((row: any) => row.name)

  // Migration 001: Initial schema
  if (!appliedMigrations.includes('001_initial_schema')) {
    console.log('Running migration: 001_initial_schema')

    database.exec(`
      CREATE TABLE panels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_positions INTEGER NOT NULL CHECK (total_positions >= 2 AND total_positions <= 100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE breakers (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        breaker_type TEXT NOT NULL CHECK (breaker_type IN ('single-pole', 'double-pole')),
        amperage INTEGER NOT NULL CHECK (amperage > 0),
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'spare')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE,
        UNIQUE (panel_id, position),
        CHECK (label IS NULL OR length(label) <= 20)
      );

      CREATE TABLE entities (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        breaker_id TEXT,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('outlet', 'switch', 'light', 'appliance', 'hvac', 'other')),
        name TEXT NOT NULL,
        room TEXT,
        location TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE,
        FOREIGN KEY (breaker_id) REFERENCES breakers(id) ON DELETE SET NULL
      );

      -- Indexes for performance
      CREATE INDEX idx_breakers_panel_id ON breakers(panel_id);
      CREATE INDEX idx_entities_breaker_id ON entities(breaker_id);
      CREATE INDEX idx_entities_room ON entities(room);
      CREATE INDEX idx_entities_name ON entities(name COLLATE NOCASE);
      CREATE INDEX idx_entities_unmapped ON entities(panel_id, breaker_id) WHERE breaker_id IS NULL;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('001_initial_schema')
    console.log('Migration 001_initial_schema completed')
  }

  // Migration 002: Add tandem breaker and panel amperage support
  if (!appliedMigrations.includes('002_add_tandem_and_amperage')) {
    console.log('Running migration: 002_add_tandem_and_amperage')

    database.exec(`
      -- Add new columns to panels table
      ALTER TABLE panels ADD COLUMN main_breaker_amperage INTEGER DEFAULT 200;

      -- Add new columns to breakers table
      ALTER TABLE breakers ADD COLUMN position_slot TEXT CHECK (position_slot IN ('a', 'b'));
      ALTER TABLE breakers ADD COLUMN linked_breaker_id TEXT REFERENCES breakers(id) ON DELETE SET NULL;

      -- Drop the old unique constraint on panel_id, position
      -- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
      CREATE TABLE breakers_new (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        position_slot TEXT CHECK (position_slot IN ('a', 'b')),
        breaker_type TEXT NOT NULL CHECK (breaker_type IN ('single-pole', 'double-pole')),
        amperage INTEGER NOT NULL CHECK (amperage > 0),
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'spare')),
        linked_breaker_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE,
        FOREIGN KEY (linked_breaker_id) REFERENCES breakers(id) ON DELETE SET NULL,
        UNIQUE (panel_id, position, position_slot),
        CHECK (label IS NULL OR length(label) <= 20)
      );

      -- Copy data from old table
      INSERT INTO breakers_new (id, panel_id, position, position_slot, breaker_type, amperage, label, status, linked_breaker_id, created_at, updated_at)
      SELECT id, panel_id, position, NULL, breaker_type, amperage, label, status, NULL, created_at, updated_at
      FROM breakers;

      -- Drop old table and rename new one
      DROP TABLE breakers;
      ALTER TABLE breakers_new RENAME TO breakers;

      -- Recreate indexes
      CREATE INDEX idx_breakers_panel_id ON breakers(panel_id);
      CREATE INDEX idx_breakers_linked ON breakers(linked_breaker_id) WHERE linked_breaker_id IS NOT NULL;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('002_add_tandem_and_amperage')
    console.log('Migration 002_add_tandem_and_amperage completed')
  }
}
