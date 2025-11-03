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

  // Migration 003: Add is_powered field to track breaker switch state
  if (!appliedMigrations.includes('003_add_is_powered')) {
    console.log('Running migration: 003_add_is_powered')

    database.exec(`
      -- Add is_powered column to breakers table
      -- Default TRUE for active breakers, FALSE for spare
      ALTER TABLE breakers ADD COLUMN is_powered INTEGER DEFAULT 1 CHECK (is_powered IN (0, 1));

      -- Set is_powered based on current status
      -- Active breakers are assumed to be powered on by default
      -- Spare breakers are powered off
      UPDATE breakers SET is_powered = CASE WHEN status = 'active' THEN 1 ELSE 0 END;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('003_add_is_powered')
    console.log('Migration 003_add_is_powered completed')
  }

  // Migration 004: Add custom entity types support
  if (!appliedMigrations.includes('004_custom_entity_types')) {
    console.log('Running migration: 004_custom_entity_types')

    database.exec(`
      -- Add custom_entity_types column to panels table (stores JSON array of custom types)
      ALTER TABLE panels ADD COLUMN custom_entity_types TEXT DEFAULT '[]';

      -- Remove CHECK constraint on entity_type to allow custom values
      -- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
      CREATE TABLE entities_new (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        breaker_id TEXT,
        entity_type TEXT NOT NULL,
        name TEXT NOT NULL,
        room TEXT,
        location TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE,
        FOREIGN KEY (breaker_id) REFERENCES breakers(id) ON DELETE SET NULL
      );

      -- Copy data from old table
      INSERT INTO entities_new (id, panel_id, breaker_id, entity_type, name, room, location, metadata, created_at, updated_at)
      SELECT id, panel_id, breaker_id, entity_type, name, room, location, metadata, created_at, updated_at
      FROM entities;

      -- Drop old table and rename new one
      DROP TABLE entities;
      ALTER TABLE entities_new RENAME TO entities;

      -- Recreate indexes
      CREATE INDEX idx_entities_breaker_id ON entities(breaker_id);
      CREATE INDEX idx_entities_room ON entities(room);
      CREATE INDEX idx_entities_name ON entities(name COLLATE NOCASE);
      CREATE INDEX idx_entities_unmapped ON entities(panel_id, breaker_id) WHERE breaker_id IS NULL;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('004_custom_entity_types')
    console.log('Migration 004_custom_entity_types completed')
  }

  // Migration 005: Add properties support for multi-panel management
  if (!appliedMigrations.includes('005_add_properties')) {
    console.log('Running migration: 005_add_properties')

    database.exec(`
      -- Create properties table
      CREATE TABLE properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        custom_entity_types TEXT DEFAULT '[]',
        is_current INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Create a default property for existing panels
      INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at)
      SELECT
        'prop_' || hex(randomblob(8)),
        'My Property',
        '[]',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
      WHERE EXISTS (SELECT 1 FROM panels);

      -- Create new panels table with property_id
      CREATE TABLE panels_new (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        name TEXT NOT NULL,
        total_positions INTEGER NOT NULL CHECK (total_positions >= 2 AND total_positions <= 100),
        main_breaker_amperage INTEGER DEFAULT 200,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );

      -- Migrate existing panels to the default property
      INSERT INTO panels_new (id, property_id, name, total_positions, main_breaker_amperage, created_at, updated_at)
      SELECT
        p.id,
        (SELECT id FROM properties LIMIT 1),
        p.name,
        p.total_positions,
        p.main_breaker_amperage,
        p.created_at,
        p.updated_at
      FROM panels p;

      -- Migrate custom_entity_types from panels to property
      UPDATE properties
      SET custom_entity_types = (
        SELECT custom_entity_types
        FROM panels
        WHERE panels.custom_entity_types != '[]'
        LIMIT 1
      )
      WHERE EXISTS (SELECT 1 FROM panels WHERE panels.custom_entity_types != '[]');

      -- Drop old panels table and rename new one
      DROP TABLE panels;
      ALTER TABLE panels_new RENAME TO panels;

      -- Create index for property lookups
      CREATE INDEX idx_panels_property_id ON panels(property_id);
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('005_add_properties')
    console.log('Migration 005_add_properties completed')
  }

  // Migration 006: Support multiple breakers per entity (for double-pole breakers)
  if (!appliedMigrations.includes('006_multiple_breakers_per_entity')) {
    console.log('Running migration: 006_multiple_breakers_per_entity')

    database.exec(`
      -- Create new entities table with breaker_ids as JSON array
      CREATE TABLE entities_new (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        breaker_ids TEXT DEFAULT '[]',  -- JSON array of breaker IDs
        entity_type TEXT NOT NULL,
        name TEXT NOT NULL,
        room TEXT,
        location TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE
      );

      -- Migrate existing data: convert single breaker_id to breaker_ids array
      INSERT INTO entities_new (id, panel_id, breaker_ids, entity_type, name, room, location, metadata, created_at, updated_at)
      SELECT
        id,
        panel_id,
        CASE
          WHEN breaker_id IS NULL THEN '[]'
          ELSE json_array(breaker_id)
        END,
        entity_type,
        name,
        room,
        location,
        metadata,
        created_at,
        updated_at
      FROM entities;

      -- Drop old table and rename new one
      DROP TABLE entities;
      ALTER TABLE entities_new RENAME TO entities;

      -- Recreate indexes
      CREATE INDEX idx_entities_panel_id ON entities(panel_id);
      CREATE INDEX idx_entities_room ON entities(room);
      CREATE INDEX idx_entities_name ON entities(name COLLATE NOCASE);
      CREATE INDEX idx_entities_unmapped ON entities(panel_id, breaker_ids) WHERE breaker_ids = '[]';
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('006_multiple_breakers_per_entity')
    console.log('Migration 006_multiple_breakers_per_entity completed')
  }
}
