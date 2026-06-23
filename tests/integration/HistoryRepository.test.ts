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
})
