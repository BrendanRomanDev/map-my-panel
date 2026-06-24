import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { tmpdir } from 'os'
import { join } from 'path'
import { runMigrations } from '../../src/main/db/migrations'
import { PropertyRepository, PanelRepository, BreakerRepository, EntityRepository } from '../../src/main/db/repositories'
import { dryRunImport, applyImport, PanelImportPlanSchema } from '../../mcp/panelImport'

// A subset of Brendan's real panel directory, modeling the hard cases:
// multi-device breaker (1), double-pole pairs (2+4 Range, 17b+19a Generator),
// tandem slots (15a/15b, 17a/17b), blanks/spares (9), implied rooms.
const REAL_PANEL = {
  breakers: [
    { position: 1, label: 'Garage', status: 'active' as const, entities: [
      { name: 'Garage Outlets', entity_type: 'outlet', room: 'Garage' },
      { name: 'Garage Lights', entity_type: 'light', room: 'Garage' },
      { name: 'Garage Door', entity_type: 'appliance', room: 'Garage' },
      { name: 'Outside Back Outlet', entity_type: 'outlet', room: 'Exterior' }
    ]},
    { position: 2, label: 'Range', status: 'active' as const, breaker_type: 'double-pole' as const, amperage: 40, entities: [
      { name: 'Range', entity_type: 'appliance', room: 'Kitchen' }
    ]},
    { position: 4, label: 'Range', status: 'active' as const, breaker_type: 'double-pole' as const, amperage: 40, entities: [] },
    { position: 7, label: 'Kitchen', status: 'active' as const, entities: [
      { name: 'Kitchen outlets', entity_type: 'outlet', room: 'Kitchen' }
    ]},
    { position: 9, label: 'blank', status: 'spare' as const, entities: [] },
    { position: 17, position_slot: 'b' as const, label: 'Generator', status: 'active' as const, breaker_type: 'double-pole' as const, entities: [
      { name: 'Generator', entity_type: 'appliance', room: 'Utility' }
    ]},
    { position: 19, position_slot: 'a' as const, label: 'Generator', status: 'active' as const, breaker_type: 'double-pole' as const, entities: [] }
  ],
  links: [
    { aPosition: '2', bPosition: '4', reason: 'Range 240V' },
    { aPosition: '17b', bPosition: '19a', reason: 'Generator 240V' }
  ]
}

describe('Panel import (MCP)', () => {
  let db: Database.Database
  let panelId: string

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
    const prop = new PropertyRepository(db).create({ name: 'Home' })
    const panel = new PanelRepository(db).create({
      property_id: prop.id,
      name: 'Main Panel',
      total_positions: 20,
      main_breaker_amperage: 200
    })
    panelId = panel.id
  })

  it('parses the real panel plan without schema errors', () => {
    expect(() => PanelImportPlanSchema.parse(REAL_PANEL)).not.toThrow()
  })

  it('dry run reports the right counts and flags double-pole links', () => {
    const plan = PanelImportPlanSchema.parse(REAL_PANEL)
    const dry = dryRunImport(db, panelId, plan)
    expect(dry.breakersToCreate).toHaveLength(7)
    expect(dry.breakersToUpdate).toHaveLength(0)
    expect(dry.entitiesToCreate).toHaveLength(7) // Garage 4 + Range 1 + Kitchen 1 + Generator 1
    expect(dry.linksToCreate).toHaveLength(2)
    expect(dry.summary).toContain('Main Panel')
  })

  it('apply creates breakers/entities, links double-poles on BOTH sides, and backs up', () => {
    const plan = PanelImportPlanSchema.parse(REAL_PANEL)
    const result = applyImport(db, panelId, plan, tmpdir())

    expect(result.breakersCreated).toBe(7)
    expect(result.entitiesCreated).toBe(7)
    expect(result.linksCreated).toBe(2)
    expect(result.backupPath).toContain('pre-import')

    const breakers = new BreakerRepository(db).listByPanel(panelId)
    const byKey = new Map(breakers.map(b => [`${b.position}${b.position_slot || ''}`, b]))

    // Generator double-pole: 17b ↔ 19a, both double-pole, mutually linked
    const g17 = byKey.get('17b')!
    const g19 = byKey.get('19a')!
    expect(g17.breaker_type).toBe('double-pole')
    expect(g19.breaker_type).toBe('double-pole')
    expect(g17.linked_breaker_id).toBe(g19.id)
    expect(g19.linked_breaker_id).toBe(g17.id)

    // Range double-pole 2 ↔ 4
    expect(byKey.get('2')!.linked_breaker_id).toBe(byKey.get('4')!.id)

    // Multi-device breaker 1 → 4 entities
    const entities = new EntityRepository(db).listByBreaker(byKey.get('1')!.id)
    expect(entities).toHaveLength(4)

    // Blank stayed a spare
    expect(byKey.get('9')!.status).toBe('spare')
  })

  it('re-running an import updates existing breakers instead of duplicating', () => {
    const plan = PanelImportPlanSchema.parse(REAL_PANEL)
    applyImport(db, panelId, plan, tmpdir())
    const dry = dryRunImport(db, panelId, plan)
    expect(dry.breakersToCreate).toHaveLength(0)
    expect(dry.breakersToUpdate.length).toBeGreaterThan(0)
    expect(dry.conflicts.length).toBeGreaterThan(0)
  })
})
