import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { HistoryRepository } from '../../src/main/db/repositories/HistoryRepository'

function makeDb(): { db: Database.Database; propertyId: string } {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)

  const propertyId = 'prop_a'
  db.prepare(
    'INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(propertyId, 'House A', '[]', 1, Date.now(), Date.now())

  return { db, propertyId }
}

describe('HistoryRepository', () => {
  let db: Database.Database
  let propertyId: string
  let repo: HistoryRepository

  beforeEach(() => {
    const ctx = makeDb()
    db = ctx.db
    propertyId = ctx.propertyId
    repo = new HistoryRepository(db)
  })

  it('creates an event with explicit targets (one event, many links)', () => {
    const event = repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-20',
      title: 'Outlet Change',
      targets: [
        { target_type: 'entity', target_id: 'outlet-a' },
        { target_type: 'entity', target_id: 'outlet-b' }
      ]
    })
    expect(event.id).toBeTruthy()
    expect(event.occurred_on).toBe('2026-06-20')
    expect(event.targets).toHaveLength(2)
  })

  it('auto-attaches to the property when no targets given (standalone note)', () => {
    const event = repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-22',
      notes: 'Utility meter sizzling, installed improperly'
    })
    expect(event.targets).toEqual([{ target_type: 'property', target_id: propertyId }])
    const onProperty = repo.listForTarget('property', propertyId)
    expect(onProperty).toHaveLength(1)
  })

  it('listForTarget returns events newest occurred_on first, with details', () => {
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-01-01', targets: [{ target_type: 'breaker', target_id: 'b1' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-01', targets: [{ target_type: 'breaker', target_id: 'b1' }] })
    const events = repo.listForTarget('breaker', 'b1')
    expect(events.map(e => e.occurred_on)).toEqual(['2026-06-01', '2026-01-01'])
  })

  it('decorates events with event_type_name and tag', () => {
    const et = repo.createEventType({ property_id: propertyId, name: 'Inspection' })
    const tagId = 'tag-1'
    db.prepare('INSERT INTO tags (id, property_id, name, condense, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
      .run(tagId, propertyId, 'GFCI', new Date().toISOString(), new Date().toISOString())

    const event = repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-05-05',
      event_type_id: et.id,
      tag_id: tagId,
      targets: [{ target_type: 'entity', target_id: 'e1' }]
    })
    expect(event.event_type_name).toBe('Inspection')
    expect(event.tag?.name).toBe('GFCI')
  })

  it('updateEvent edits fields including occurred_on and tag', () => {
    const event = repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', targets: [{ target_type: 'entity', target_id: 'e1' }] })
    const updated = repo.updateEvent(event.id, { occurred_on: '2026-06-25', notes: 'fixed date' })!
    expect(updated.occurred_on).toBe('2026-06-25')
    expect(updated.notes).toBe('fixed date')
  })

  it('addTargets and removeTarget mutate the link set (misclick fix)', () => {
    const event = repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-20',
      targets: [
        { target_type: 'entity', target_id: 'e1' },
        { target_type: 'entity', target_id: 'e2-mistake' }
      ]
    })
    expect(repo.removeTarget(event.id, 'entity', 'e2-mistake')).toBe(true)
    expect(repo.listTargets(event.id)).toHaveLength(1)

    repo.addTargets(event.id, [{ target_type: 'entity', target_id: 'e3' }])
    expect(repo.listTargets(event.id)).toHaveLength(2)
  })

  it('removing the last link is blocked (event must keep >= 1)', () => {
    const event = repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', targets: [{ target_type: 'entity', target_id: 'only' }] })
    expect(repo.removeTarget(event.id, 'entity', 'only')).toBe(false)
    expect(repo.listTargets(event.id)).toHaveLength(1)
  })

  it('deleteEvent cascades its links', () => {
    const event = repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', targets: [{ target_type: 'entity', target_id: 'e1' }] })
    expect(repo.deleteEvent(event.id)).toBe(true)
    expect(repo.findById(event.id)).toBeNull()
    expect(repo.listForTarget('entity', 'e1')).toHaveLength(0)
  })

  it('listForProperty returns all events for the property', () => {
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', targets: [{ target_type: 'breaker', target_id: 'b1' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-21' })
    expect(repo.listForProperty(propertyId)).toHaveLength(2)
  })

  it('event types: list (scoped + global), create, update, delete', () => {
    repo.createEventType({ property_id: propertyId, name: 'Custom A' })
    repo.createEventType({ property_id: null, name: 'Global B' })
    const names = repo.listEventTypes(propertyId).map(t => t.name)
    expect(names).toContain('Custom A')
    expect(names).toContain('Global B')

    const et = repo.createEventType({ property_id: propertyId, name: 'Temp' })
    const renamed = repo.updateEventType(et.id, { name: 'Renamed' })!
    expect(renamed.name).toBe('Renamed')
    expect(repo.deleteEventType(et.id)).toBe(true)
  })

  it('countEventsForType returns how many events use a type', () => {
    const et = repo.createEventType({ property_id: propertyId, name: 'Inspection' })
    expect(repo.countEventsForType(et.id)).toBe(0)
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-20', event_type_id: et.id, targets: [{ target_type: 'entity', target_id: 'e1' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-21', event_type_id: et.id, targets: [{ target_type: 'entity', target_id: 'e2' }] })
    expect(repo.countEventsForType(et.id)).toBe(2)
  })

  it('deleting an event type sets referencing events event_type_id to NULL (history survives)', () => {
    const et = repo.createEventType({ property_id: propertyId, name: 'Throwaway' })
    const event = repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-20',
      event_type_id: et.id,
      targets: [{ target_type: 'entity', target_id: 'e1' }]
    })
    repo.deleteEventType(et.id)
    const after = repo.findByIdWithDetails(event.id)!
    expect(after.event_type_id).toBeNull()
    expect(after.event_type_name).toBeNull()
  })

  it('listForPanel includes panel/breaker/entity events, excludes other panels + property-only', () => {
    // Panel A: a breaker + an entity. Panel B: a breaker.
    db.prepare("INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES ('pA', ?, 'A', 20, 200)").run(propertyId)
    db.prepare("INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES ('pB', ?, 'B', 20, 200)").run(propertyId)
    db.prepare("INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container) VALUES ('brA','pA',1,'single-pole',15,'active',1,0)").run()
    db.prepare("INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container) VALUES ('brB','pB',1,'single-pole',15,'active',1,0)").run()
    db.prepare("INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES ('eA','pA','[]','outlet','EA')").run()

    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-01', targets: [{ target_type: 'panel', target_id: 'pA' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-02', targets: [{ target_type: 'breaker', target_id: 'brA' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-03', targets: [{ target_type: 'entity', target_id: 'eA' }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-04', targets: [{ target_type: 'breaker', target_id: 'brB' }] }) // other panel
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-05' }) // property-only (auto-attach)

    const a = repo.listForPanel('pA')
    expect(a).toHaveLength(3) // panel + breaker + entity on A
    const occurred = a.map(e => e.occurred_on)
    expect(occurred).not.toContain('2026-06-04') // not panel B
    expect(occurred).not.toContain('2026-06-05') // not property-only
    // newest first
    expect(occurred[0]).toBe('2026-06-03')

    expect(repo.listForPanel('pB')).toHaveLength(1)
  })

  it('listForBreakerRollup includes direct breaker events AND its entities events', () => {
    // Set up a panel, a breaker, and an entity assigned to that breaker
    const panelId = 'panel-1'
    db.prepare(
      'INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?, ?, ?, ?, ?)'
    ).run(panelId, propertyId, 'Main', 20, 200)
    const breakerId = 'breaker-1'
    db.prepare(
      `INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container)
       VALUES (?, ?, ?, 'single-pole', 15, 'active', 1, 0)`
    ).run(breakerId, panelId, 1)
    const entityId = 'entity-1'
    db.prepare(
      `INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES (?, ?, ?, 'outlet', 'Kitchen Outlet')`
    ).run(entityId, panelId, JSON.stringify([breakerId]))

    // One event directly on the breaker, one on the entity
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-01', targets: [{ target_type: 'breaker', target_id: breakerId }] })
    repo.createEvent({ property_id: propertyId, occurred_on: '2026-06-10', targets: [{ target_type: 'entity', target_id: entityId }] })

    const rolled = repo.listForBreakerRollup(breakerId)
    expect(rolled).toHaveLength(2)
    const directOne = rolled.find(e => e.via === 'direct')
    const viaEntity = rolled.find(e => e.via !== 'direct')
    expect(directOne).toBeTruthy()
    expect(viaEntity).toBeTruthy()
    expect(viaEntity!.via).toMatchObject({ entityName: 'Kitchen Outlet' })
  })

  it('rollup dedupes when an event targets both the breaker and its entity (direct wins)', () => {
    const panelId = 'panel-2'
    db.prepare(
      'INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?, ?, ?, ?, ?)'
    ).run(panelId, propertyId, 'Main2', 20, 200)
    const breakerId = 'breaker-2'
    db.prepare(
      `INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status, is_powered, is_container)
       VALUES (?, ?, ?, 'single-pole', 15, 'active', 1, 0)`
    ).run(breakerId, panelId, 1)
    const entityId = 'entity-2'
    db.prepare(
      `INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name) VALUES (?, ?, ?, 'outlet', 'Outlet')`
    ).run(entityId, panelId, JSON.stringify([breakerId]))

    repo.createEvent({
      property_id: propertyId,
      occurred_on: '2026-06-05',
      targets: [
        { target_type: 'breaker', target_id: breakerId },
        { target_type: 'entity', target_id: entityId }
      ]
    })

    const rolled = repo.listForBreakerRollup(breakerId)
    expect(rolled).toHaveLength(1)
    expect(rolled[0].via).toBe('direct')
  })
})
