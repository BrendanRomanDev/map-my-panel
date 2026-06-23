import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { BackupRepository } from '../../src/main/db/repositories/BackupRepository'
import { TagRepository } from '../../src/main/db/repositories/TagRepository'
import { HistoryRepository } from '../../src/main/db/repositories/HistoryRepository'

function seed(db: Database.Database) {
  const propertyId = 'prop_a'
  db.prepare(
    'INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(propertyId, 'House', '[]', 1, Date.now(), Date.now())
  db.prepare(
    'INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?, ?, ?, ?, ?)'
  ).run('panel-1', propertyId, 'Main', 20, 200)
  db.prepare(
    `INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container)
     VALUES ('breaker-1', 'panel-1', 1, 'single-pole', 15, 'active', 1, 0)`
  ).run()
  db.prepare(
    `INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES ('entity-1', 'panel-1', ?, 'outlet', 'Outlet')`
  ).run(JSON.stringify(['breaker-1']))
  return propertyId
}

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

describe('Backup v3 round-trip (tags & history preserved)', () => {
  let db: Database.Database
  let propertyId: string

  beforeEach(() => {
    db = freshDb()
    propertyId = seed(db)
  })

  it('exports v3.0 including tags and history tables', () => {
    const backup = new BackupRepository(db).exportDatabase()
    expect(backup.version).toBe('3.0')
    expect(backup).toHaveProperty('tags')
    expect(backup).toHaveProperty('tagLinks')
    expect(backup).toHaveProperty('eventTypes')
    expect(backup).toHaveProperty('historyEvents')
    expect(backup).toHaveProperty('eventLinks')
  })

  it('round-trips tags and history into a clean database', () => {
    const tags = new TagRepository(db)
    const history = new HistoryRepository(db)

    const tag = tags.create({ property_id: propertyId, name: 'GFCI', icon: '🛡️', condense: true })
    tags.attach(tag.id, 'breaker', 'breaker-1')
    const et = history.createEventType({ property_id: propertyId, name: 'Inspection' })
    history.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-20',
      event_type_id: et.id,
      tag_id: tag.id,
      notes: 'passed',
      targets: [{ target_type: 'entity', target_id: 'entity-1' }]
    })

    const backup = new BackupRepository(db).exportDatabase()

    // Import into a brand-new DB
    const db2 = freshDb()
    new BackupRepository(db2).importDatabase(backup)

    const tags2 = new TagRepository(db2)
    const history2 = new HistoryRepository(db2)

    // Tag restored with metadata + attachment
    const restoredTags = tags2.listForTarget('breaker', 'breaker-1')
    expect(restoredTags).toHaveLength(1)
    expect(restoredTags[0].name).toBe('GFCI')
    expect(restoredTags[0].icon).toBe('🛡️')
    expect(restoredTags[0].condense).toBe(true)

    // Event restored with type, tag, target
    const events = history2.listForTarget('entity', 'entity-1')
    expect(events).toHaveLength(1)
    expect(events[0].event_type_name).toBe('Inspection')
    expect(events[0].tag?.name).toBe('GFCI')
    expect(events[0].notes).toBe('passed')
  })

  it('still imports a legacy v2.0 backup (no tags/history) without error', () => {
    const v2 = {
      version: '2.0' as const,
      exportDate: new Date(0).toISOString(),
      properties: [
        { id: 'p', name: 'P', custom_entity_types: [], is_current: true, created_at: 1, updated_at: 1 }
      ],
      panels: [
        { id: 'pan', property_id: 'p', name: 'Main', total_positions: 12, main_breaker_amperage: 100, created_at: new Date(), updated_at: new Date() }
      ],
      breakers: [],
      entities: []
    }
    const db2 = freshDb()
    expect(() => new BackupRepository(db2).importDatabase(v2 as any)).not.toThrow()
    const props = db2.prepare('SELECT COUNT(*) c FROM properties').get() as any
    expect(props.c).toBe(1)
  })
})
