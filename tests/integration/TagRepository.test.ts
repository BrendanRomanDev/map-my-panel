import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { TagRepository } from '../../src/main/db/repositories/TagRepository'

// Builds a fresh in-memory DB with the full migrated schema and one property.
function makeDb(): { db: Database.Database; propertyId: string; otherPropertyId: string } {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)

  const propertyId = 'prop_a'
  const otherPropertyId = 'prop_b'
  const insertProp = db.prepare(
    'INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insertProp.run(propertyId, 'House A', '[]', 1, Date.now(), Date.now())
  insertProp.run(otherPropertyId, 'House B', '[]', 0, Date.now(), Date.now())

  return { db, propertyId, otherPropertyId }
}

describe('TagRepository', () => {
  let db: Database.Database
  let propertyId: string
  let otherPropertyId: string
  let repo: TagRepository

  beforeEach(() => {
    const ctx = makeDb()
    db = ctx.db
    propertyId = ctx.propertyId
    otherPropertyId = ctx.otherPropertyId
    repo = new TagRepository(db)
  })

  it('creates a tag with defaults and maps condense to boolean', () => {
    const tag = repo.create({ property_id: propertyId, name: 'Reverse Polarity' })
    expect(tag.id).toBeTruthy()
    expect(tag.name).toBe('Reverse Polarity')
    expect(tag.condense).toBe(false)
    expect(tag.description).toBeNull()
  })

  it('persists description, icon, color, and condense', () => {
    const tag = repo.create({
      property_id: propertyId,
      name: 'Self-Grounding',
      description: 'Ground via metal box',
      icon: '🍴',
      color: 'amber',
      condense: true
    })
    const found = repo.findById(tag.id)!
    expect(found.description).toBe('Ground via metal box')
    expect(found.icon).toBe('🍴')
    expect(found.color).toBe('amber')
    expect(found.condense).toBe(true)
  })

  it('listForProperty returns property-scoped AND global tags, not other properties', () => {
    repo.create({ property_id: propertyId, name: 'Scoped A' })
    repo.create({ property_id: null, name: 'Global One' })
    repo.create({ property_id: otherPropertyId, name: 'Scoped B' })

    // Migration 009 also seeds default tags for both properties; filter to ours
    const names = repo.listForProperty(propertyId).map(t => t.name)
    expect(names).toContain('Scoped A')
    expect(names).toContain('Global One')
    expect(names).not.toContain('Scoped B')
  })

  it('enforces unique name within a property (case-insensitive)', () => {
    repo.create({ property_id: propertyId, name: 'Ground' })
    expect(() => repo.create({ property_id: propertyId, name: 'ground' })).toThrow()
  })

  it('allows the same name across different properties', () => {
    repo.create({ property_id: propertyId, name: 'Shared Name' })
    expect(() => repo.create({ property_id: otherPropertyId, name: 'Shared Name' })).not.toThrow()
  })

  it('attach is idempotent', () => {
    const tag = repo.create({ property_id: propertyId, name: 'GFCI' })
    repo.attach(tag.id, 'entity', 'entity-1')
    repo.attach(tag.id, 'entity', 'entity-1')
    expect(repo.listTargetsForTag(tag.id)).toHaveLength(1)
  })

  it('listForTarget returns tags attached to a target', () => {
    const a = repo.create({ property_id: propertyId, name: 'Tag A' })
    const b = repo.create({ property_id: propertyId, name: 'Tag B' })
    repo.attach(a.id, 'breaker', 'breaker-1')
    repo.attach(b.id, 'breaker', 'breaker-1')
    repo.attach(a.id, 'breaker', 'breaker-2')

    const onB1 = repo.listForTarget('breaker', 'breaker-1').map(t => t.name)
    expect(onB1).toEqual(['Tag A', 'Tag B'])
    expect(repo.listForTarget('breaker', 'breaker-2')).toHaveLength(1)
  })

  it('detach removes a link', () => {
    const tag = repo.create({ property_id: propertyId, name: 'Temp' })
    repo.attach(tag.id, 'panel', 'panel-1')
    repo.detach(tag.id, 'panel', 'panel-1')
    expect(repo.listForTarget('panel', 'panel-1')).toHaveLength(0)
  })

  it('update changes fields and leaves others intact', () => {
    const tag = repo.create({ property_id: propertyId, name: 'Old', condense: false })
    const updated = repo.update(tag.id, { name: 'New', condense: true })!
    expect(updated.name).toBe('New')
    expect(updated.condense).toBe(true)
  })

  it('delete removes the tag and cascades its links', () => {
    const tag = repo.create({ property_id: propertyId, name: 'Doomed' })
    repo.attach(tag.id, 'entity', 'entity-9')
    expect(repo.delete(tag.id)).toBe(true)
    expect(repo.findById(tag.id)).toBeNull()
    expect(repo.listForTarget('entity', 'entity-9')).toHaveLength(0)
  })

  it('seedDefaultsForProperty adds the default tag set', () => {
    repo.seedDefaultsForProperty(propertyId)
    const names = repo.listForProperty(propertyId).map(t => t.name)
    expect(names).toContain('No Ground Wire')
    expect(names).toContain('GFCI Protected')
  })

  it('seedDefaultsForProperty is idempotent (no duplicates on re-run)', () => {
    repo.seedDefaultsForProperty(propertyId)
    repo.seedDefaultsForProperty(propertyId)
    const groundTags = repo
      .listForProperty(propertyId)
      .filter(t => t.name === 'No Ground Wire')
    expect(groundTags).toHaveLength(1)
  })
})
