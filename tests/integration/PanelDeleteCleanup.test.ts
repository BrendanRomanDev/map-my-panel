import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { PanelRepository } from '../../src/main/db/repositories/PanelRepository'
import { HistoryRepository } from '../../src/main/db/repositories/HistoryRepository'
import { TagRepository } from '../../src/main/db/repositories/TagRepository'

// Verifies that deleting a panel cleans up the polymorphic tag/history links
// for the panel and its breakers/entities (which cascade-delete via FK but
// leave dangling links otherwise), and prunes orphaned history events.
describe('Panel delete — polymorphic link cleanup', () => {
  let db: Database.Database
  let propertyId: string
  let panelId: string
  let breakerId: string
  let entityId: string

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)

    propertyId = 'prop_a'
    db.prepare(
      'INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(propertyId, 'House', '[]', 1, Date.now(), Date.now())

    panelId = 'panel-1'
    db.prepare(
      'INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?, ?, ?, ?, ?)'
    ).run(panelId, propertyId, 'Main', 20, 200)

    breakerId = 'breaker-1'
    db.prepare(
      `INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container)
       VALUES (?, ?, ?, 'single-pole', 15, 'active', 1, 0)`
    ).run(breakerId, panelId, 1)

    entityId = 'entity-1'
    db.prepare(
      `INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES (?, ?, ?, 'outlet', 'Outlet')`
    ).run(entityId, panelId, JSON.stringify([breakerId]))
  })

  it('removes tag/event links for the panel, its breakers and entities; prunes orphan events', () => {
    const tags = new TagRepository(db)
    const history = new HistoryRepository(db)
    const panels = new PanelRepository(db)

    const tag = tags.create({ property_id: propertyId, name: 'GFCI' })
    tags.attach(tag.id, 'breaker', breakerId)
    tags.attach(tag.id, 'entity', entityId)
    tags.attach(tag.id, 'panel', panelId)

    // An event only on this panel's entity → should be pruned when panel goes.
    history.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', targets: [{ target_type: 'entity', target_id: entityId }] })

    expect(db.prepare('SELECT COUNT(*) c FROM tag_links').get() as any).toMatchObject({ c: 3 })
    expect(db.prepare('SELECT COUNT(*) c FROM event_links').get() as any).toMatchObject({ c: 1 })
    expect(db.prepare('SELECT COUNT(*) c FROM history_events').get() as any).toMatchObject({ c: 1 })

    panels.delete(panelId)

    // All links gone, orphan event pruned. The tag itself survives.
    expect(db.prepare('SELECT COUNT(*) c FROM tag_links').get() as any).toMatchObject({ c: 0 })
    expect(db.prepare('SELECT COUNT(*) c FROM event_links').get() as any).toMatchObject({ c: 0 })
    expect(db.prepare('SELECT COUNT(*) c FROM history_events').get() as any).toMatchObject({ c: 0 })
    expect(tags.findById(tag.id)).not.toBeNull()
  })

  it('keeps a multi-target event that still has links elsewhere after panel delete', () => {
    const history = new HistoryRepository(db)
    const panels = new PanelRepository(db)

    // Second panel + entity in the same property
    db.prepare(
      'INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?, ?, ?, ?, ?)'
    ).run('panel-2', propertyId, 'Sub', 12, 100)
    db.prepare(
      `INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES (?, ?, ?, 'outlet', 'Other')`
    ).run('entity-2', 'panel-2', JSON.stringify([]))

    // One event spanning an entity on panel-1 AND an entity on panel-2
    const ev = history.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-20',
      targets: [
        { target_type: 'entity', target_id: entityId },
        { target_type: 'entity', target_id: 'entity-2' }
      ]
    })

    panels.delete(panelId)

    // Event survives (still linked to entity-2); only the panel-1 link is gone.
    expect(history.findById(ev.id)).not.toBeNull()
    const remaining = history.listTargets(ev.id)
    expect(remaining).toEqual([{ target_type: 'entity', target_id: 'entity-2' }])
  })
})
