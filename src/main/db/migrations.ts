import Database from 'better-sqlite3'

export function runMigrations(database: Database.Database): void {
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

  // Migration 007: Add is_container flag for tandem breaker base positions
  if (!appliedMigrations.includes('007_add_is_container')) {
    console.log('Running migration: 007_add_is_container')

    database.exec(`
      -- Create new breakers table with is_container flag and nullable amperage/breaker_type
      CREATE TABLE breakers_new (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        position_slot TEXT CHECK (position_slot IN ('a', 'b')),
        breaker_type TEXT CHECK (breaker_type IN ('single-pole', 'double-pole')),
        amperage INTEGER CHECK (amperage > 0 OR amperage IS NULL),
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'spare')),
        linked_breaker_id TEXT,
        is_powered INTEGER DEFAULT 1 CHECK (is_powered IN (0, 1)),
        is_container INTEGER DEFAULT 0 CHECK (is_container IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE,
        FOREIGN KEY (linked_breaker_id) REFERENCES breakers(id) ON DELETE SET NULL,
        UNIQUE (panel_id, position, position_slot),
        CHECK (label IS NULL OR length(label) <= 20),
        -- Container breakers can have NULL amperage/type, but regular breakers must have them
        CHECK (
          (is_container = 1 AND amperage IS NULL AND breaker_type IS NULL) OR
          (is_container = 0 AND amperage IS NOT NULL AND breaker_type IS NOT NULL)
        )
      );

      -- Copy data from old table and identify containers
      -- For containers, set amperage and breaker_type to NULL immediately
      INSERT INTO breakers_new (id, panel_id, position, position_slot, breaker_type, amperage, label, status, linked_breaker_id, is_powered, is_container, created_at, updated_at)
      SELECT
        b.id,
        b.panel_id,
        b.position,
        b.position_slot,
        -- Set breaker_type to NULL for containers
        CASE
          WHEN b.position_slot IS NULL AND EXISTS (
            SELECT 1 FROM breakers b2
            WHERE b2.panel_id = b.panel_id
            AND b2.position = b.position
            AND b2.position_slot IS NOT NULL
          ) THEN NULL
          ELSE b.breaker_type
        END,
        -- Set amperage to NULL for containers
        CASE
          WHEN b.position_slot IS NULL AND EXISTS (
            SELECT 1 FROM breakers b2
            WHERE b2.panel_id = b.panel_id
            AND b2.position = b.position
            AND b2.position_slot IS NOT NULL
          ) THEN NULL
          ELSE b.amperage
        END,
        b.label,
        b.status,
        b.linked_breaker_id,
        b.is_powered,
        -- Mark as container if position_slot IS NULL AND other breakers exist at same position with slots
        CASE
          WHEN b.position_slot IS NULL AND EXISTS (
            SELECT 1 FROM breakers b2
            WHERE b2.panel_id = b.panel_id
            AND b2.position = b.position
            AND b2.position_slot IS NOT NULL
          ) THEN 1
          ELSE 0
        END,
        b.created_at,
        b.updated_at
      FROM breakers b;

      -- Drop old table and rename new one
      DROP TABLE breakers;
      ALTER TABLE breakers_new RENAME TO breakers;

      -- Recreate indexes
      CREATE INDEX idx_breakers_panel_id ON breakers(panel_id);
      CREATE INDEX idx_breakers_linked ON breakers(linked_breaker_id) WHERE linked_breaker_id IS NOT NULL;
      CREATE INDEX idx_breakers_containers ON breakers(panel_id, position) WHERE is_container = 1;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('007_add_is_container')
    console.log('Migration 007_add_is_container completed')
  }

  // Migration 008: Fix existing tandem base positions that should be containers
  if (!appliedMigrations.includes('008_fix_existing_tandem_containers')) {
    console.log('Running migration: 008_fix_existing_tandem_containers')

    database.exec(`
      -- Find all base positions that have tandem children but aren't marked as containers
      -- and convert them to containers
      UPDATE breakers
      SET
        is_container = 1,
        amperage = NULL,
        breaker_type = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        position_slot IS NULL
        AND is_container = 0
        AND EXISTS (
          SELECT 1 FROM breakers b2
          WHERE b2.panel_id = breakers.panel_id
          AND b2.position = breakers.position
          AND b2.position_slot IS NOT NULL
        );
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('008_fix_existing_tandem_containers')
    console.log('Migration 008_fix_existing_tandem_containers completed')
  }

  // Migration 009: Tags (reusable labels attachable to panels, breakers, or entities)
  if (!appliedMigrations.includes('009_add_tags')) {
    console.log('Running migration: 009_add_tags')

    database.exec(`
      -- Tags: property_id NULL means global/shared across all properties
      CREATE TABLE tags (
        id          TEXT PRIMARY KEY,
        property_id TEXT,
        name        TEXT NOT NULL,
        description TEXT,
        color       TEXT,
        icon        TEXT,
        condense    INTEGER NOT NULL DEFAULT 0 CHECK (condense IN (0, 1)),
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );

      -- Polymorphic links: a tag attached to a (target_type, target_id).
      -- No FK on the target columns (SQLite can't FK polymorphic refs); the
      -- repository layer enforces integrity and cleans up on parent delete.
      CREATE TABLE tag_links (
        id          TEXT PRIMARY KEY,
        tag_id      TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('panel', 'breaker', 'entity', 'property')),
        target_id   TEXT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE (tag_id, target_type, target_id)
      );

      CREATE INDEX idx_tags_property ON tags(property_id);
      CREATE INDEX idx_tag_links_target ON tag_links(target_type, target_id);
      CREATE INDEX idx_tag_links_tag ON tag_links(tag_id);

      -- Case-insensitive name uniqueness, per scope. Split into two partial
      -- indexes because SQLite treats each NULL property_id as distinct.
      CREATE UNIQUE INDEX idx_tags_name_scoped ON tags(property_id, name COLLATE NOCASE)
        WHERE property_id IS NOT NULL;
      CREATE UNIQUE INDEX idx_tags_name_global ON tags(name COLLATE NOCASE)
        WHERE property_id IS NULL;

      -- Seed default tags (with icon/color/condense) for every existing
      -- property (additive; existing data untouched). Defaults are editable.
      INSERT INTO tags (id, property_id, name, icon, color, condense, created_at, updated_at)
      SELECT 'tag_' || hex(randomblob(8)), p.id, t.name, t.icon, t.color, t.condense, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM properties p
      CROSS JOIN (
        SELECT 'No Ground Wire' AS name, '🚫' AS icon, 'red' AS color, 1 AS condense
        UNION ALL SELECT 'Grounded to Box (Self-Grounding)', '🔩', 'amber', 1
        UNION ALL SELECT 'Reverse Polarity', '⚡', 'red', 1
        UNION ALL SELECT 'GFCI Protected', '🛡️', 'green', 0
        UNION ALL SELECT 'AFCI Protected', '🛡️', 'blue', 0
      ) t;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('009_add_tags')
    console.log('Migration 009_add_tags completed')
  }

  // Migration 010: History events + event types (unified service/event log)
  if (!appliedMigrations.includes('010_add_history')) {
    console.log('Running migration: 010_add_history')

    database.exec(`
      -- Event types: property_id NULL means global/shared across all properties
      CREATE TABLE event_types (
        id          TEXT PRIMARY KEY,
        property_id TEXT,
        name        TEXT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );

      -- A dated, typed historical record. occurred_on is the editable maintenance
      -- date; logged_at is the immutable record timestamp. tag_id is an optional,
      -- editable bridge to a tag.
      CREATE TABLE history_events (
        id            TEXT PRIMARY KEY,
        property_id   TEXT NOT NULL,
        event_type_id TEXT,
        title         TEXT,
        notes         TEXT,
        occurred_on   TEXT NOT NULL,
        logged_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        tag_id        TEXT,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id)   REFERENCES properties(id)  ON DELETE CASCADE,
        FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE SET NULL,
        FOREIGN KEY (tag_id)        REFERENCES tags(id)        ON DELETE SET NULL
      );

      -- One event, many targets. Mutable so a misclicked target can be removed.
      CREATE TABLE event_links (
        id          TEXT PRIMARY KEY,
        event_id    TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('panel', 'breaker', 'entity', 'property')),
        target_id   TEXT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES history_events(id) ON DELETE CASCADE,
        UNIQUE (event_id, target_type, target_id)
      );

      CREATE INDEX idx_event_types_property ON event_types(property_id);
      CREATE INDEX idx_history_events_property ON history_events(property_id);
      CREATE INDEX idx_history_events_occurred ON history_events(occurred_on);
      CREATE INDEX idx_event_links_target ON event_links(target_type, target_id);
      CREATE INDEX idx_event_links_event ON event_links(event_id);

      CREATE UNIQUE INDEX idx_event_types_name_scoped ON event_types(property_id, name COLLATE NOCASE)
        WHERE property_id IS NOT NULL;
      CREATE UNIQUE INDEX idx_event_types_name_global ON event_types(name COLLATE NOCASE)
        WHERE property_id IS NULL;

      -- Seed default event types for every existing property
      INSERT INTO event_types (id, property_id, name, created_at)
      SELECT 'evt_' || hex(randomblob(8)), p.id, t.name, CURRENT_TIMESTAMP
      FROM properties p
      CROSS JOIN (
        SELECT 'Inspection' AS name
        UNION ALL SELECT 'Outlet Change'
        UNION ALL SELECT 'Switch Change'
        UNION ALL SELECT 'Fixture Change'
        UNION ALL SELECT 'Breaker Added'
        UNION ALL SELECT 'Breaker Removed'
        UNION ALL SELECT 'Meter Install'
        UNION ALL SELECT 'Power Outage'
        UNION ALL SELECT 'Repair'
        UNION ALL SELECT 'Inspection (Third Party)'
        UNION ALL SELECT 'Note'
        UNION ALL SELECT 'Other'
      ) t;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('010_add_history')
    console.log('Migration 010_add_history completed')
  }

  // Migration 011: Backfill icons/colors/condense onto default tags seeded
  // by migration 009 before defaults carried visual metadata. Only touches
  // rows that still match the default name AND have no icon yet, so any user
  // edits are preserved.
  if (!appliedMigrations.includes('011_default_tag_icons')) {
    console.log('Running migration: 011_default_tag_icons')

    const defaults: Array<[string, string, string, number]> = [
      ['No Ground Wire', '🚫', 'red', 1],
      ['Grounded to Box (Self-Grounding)', '🔩', 'amber', 1],
      ['Reverse Polarity', '⚡', 'red', 1],
      ['GFCI Protected', '🛡️', 'green', 0],
      ['AFCI Protected', '🛡️', 'blue', 0]
    ]

    const update = database.prepare(`
      UPDATE tags
      SET icon = ?, color = ?, condense = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ? AND icon IS NULL
    `)

    const runAll = database.transaction(() => {
      for (const [name, icon, color, condense] of defaults) {
        update.run(icon, color, condense, name)
      }
    })
    runAll()

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('011_default_tag_icons')
    console.log('Migration 011_default_tag_icons completed')
  }

  // Migration 012: DB-level integrity for polymorphic tag/history links.
  //
  // tag_links/event_links reference panels/breakers/entities/properties via a
  // (target_type, target_id) pair, which can't be a real FK. So when a parent
  // row is deleted — ESPECIALLY via an ON DELETE CASCADE that bypasses the
  // repository layer — those links were left dangling. These AFTER DELETE
  // triggers enforce cleanup at the database layer, so it fires no matter how
  // the row is deleted. Also backfills cleanup of any pre-existing orphans.
  if (!appliedMigrations.includes('012_polymorphic_link_integrity')) {
    console.log('Running migration: 012_polymorphic_link_integrity')

    database.exec(`
      -- 1) Clean up orphans already in the database (pre-trigger)
      DELETE FROM tag_links
      WHERE (target_type = 'panel'    AND target_id NOT IN (SELECT id FROM panels))
         OR (target_type = 'breaker'  AND target_id NOT IN (SELECT id FROM breakers))
         OR (target_type = 'entity'   AND target_id NOT IN (SELECT id FROM entities))
         OR (target_type = 'property' AND target_id NOT IN (SELECT id FROM properties));

      DELETE FROM event_links
      WHERE (target_type = 'panel'    AND target_id NOT IN (SELECT id FROM panels))
         OR (target_type = 'breaker'  AND target_id NOT IN (SELECT id FROM breakers))
         OR (target_type = 'entity'   AND target_id NOT IN (SELECT id FROM entities))
         OR (target_type = 'property' AND target_id NOT IN (SELECT id FROM properties));

      DELETE FROM history_events
      WHERE id NOT IN (SELECT DISTINCT event_id FROM event_links);

      -- 2) AFTER DELETE triggers: remove links for the deleted target. These
      -- fire on FK cascades too, closing the bypass.
      CREATE TRIGGER trg_panel_delete_links AFTER DELETE ON panels
      BEGIN
        DELETE FROM tag_links   WHERE target_type = 'panel' AND target_id = OLD.id;
        DELETE FROM event_links WHERE target_type = 'panel' AND target_id = OLD.id;
      END;

      CREATE TRIGGER trg_breaker_delete_links AFTER DELETE ON breakers
      BEGIN
        DELETE FROM tag_links   WHERE target_type = 'breaker' AND target_id = OLD.id;
        DELETE FROM event_links WHERE target_type = 'breaker' AND target_id = OLD.id;
      END;

      CREATE TRIGGER trg_entity_delete_links AFTER DELETE ON entities
      BEGIN
        DELETE FROM tag_links   WHERE target_type = 'entity' AND target_id = OLD.id;
        DELETE FROM event_links WHERE target_type = 'entity' AND target_id = OLD.id;
      END;

      CREATE TRIGGER trg_property_delete_links AFTER DELETE ON properties
      BEGIN
        DELETE FROM tag_links   WHERE target_type = 'property' AND target_id = OLD.id;
        DELETE FROM event_links WHERE target_type = 'property' AND target_id = OLD.id;
      END;

      -- 3) When an event link is removed, prune the event if it has no links left.
      CREATE TRIGGER trg_event_link_prune AFTER DELETE ON event_links
      BEGIN
        DELETE FROM history_events
        WHERE id = OLD.event_id
          AND NOT EXISTS (SELECT 1 FROM event_links WHERE event_id = OLD.event_id);
      END;
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('012_polymorphic_link_integrity')
    console.log('Migration 012_polymorphic_link_integrity completed')
  }

  // Migration 013: Tasks (entity-linked to-dos). Additive — new table only.
  if (!appliedMigrations.includes('013_add_tasks')) {
    console.log('Running migration: 013_add_tasks')

    database.exec(`
      CREATE TABLE tasks (
        id           TEXT PRIMARY KEY,
        entity_id    TEXT NOT NULL,
        title        TEXT NOT NULL,
        notes        TEXT,
        task_type    TEXT,
        status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_tasks_entity ON tasks(entity_id);
      CREATE INDEX idx_tasks_status ON tasks(status);
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('013_add_tasks')
    console.log('Migration 013_add_tasks completed')
  }

  // Migration 014: Tag-wired tasks — completion rules on the task + templates.
  if (!appliedMigrations.includes('014_task_rules_and_templates')) {
    console.log('Running migration: 014_task_rules_and_templates')

    database.exec(`
      -- Completion rules stored on the task itself (JSON arrays of tag ids).
      ALTER TABLE tasks ADD COLUMN on_create_tag_id TEXT;
      ALTER TABLE tasks ADD COLUMN on_complete_remove_tag_ids TEXT DEFAULT '[]';
      ALTER TABLE tasks ADD COLUMN on_complete_add_tag_ids TEXT DEFAULT '[]';
      ALTER TABLE tasks ADD COLUMN on_complete_log_history INTEGER DEFAULT 0 CHECK (on_complete_log_history IN (0, 1));

      -- Reusable task templates (the configured task minus the entity).
      CREATE TABLE task_templates (
        id                          TEXT PRIMARY KEY,
        property_id                 TEXT,
        name                        TEXT NOT NULL,
        task_type                   TEXT,
        title_template              TEXT NOT NULL,
        notes                       TEXT,
        on_create_tag_id            TEXT,
        on_complete_remove_tag_ids  TEXT DEFAULT '[]',
        on_complete_add_tag_ids     TEXT DEFAULT '[]',
        on_complete_log_history     INTEGER DEFAULT 0 CHECK (on_complete_log_history IN (0, 1)),
        created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_task_templates_property ON task_templates(property_id);
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('014_task_rules_and_templates')
    console.log('Migration 014_task_rules_and_templates completed')
  }
}
