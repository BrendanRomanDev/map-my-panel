import { describe, it, expect } from 'vitest'
import { generateTaskCandidates } from '../../src/renderer/components/tasks/generateTasks'
import type { Entity, TaskWithEntity } from '../../src/shared/types'

function ent(over: Partial<Entity> & { id: string; name: string }): Entity {
  return {
    panel_id: 'p', breaker_ids: [], entity_type: 'outlet', room: null,
    location: null, metadata: {}, created_at: new Date(), updated_at: new Date(),
    ...over
  }
}

describe('generateTaskCandidates', () => {
  it('suggests Map Circuit for unmapped entities', () => {
    const entities = [ent({ id: 'e1', name: 'Mystery Outlet' })] // no breaker
    const out = generateTaskCandidates(entities, [], [])
    expect(out).toHaveLength(1)
    expect(out[0].taskType).toBe('Map Circuit')
    expect(out[0].entityId).toBe('e1')
  })

  it('suggests Self-Ground for Needs Grounding entities (with 2P note)', () => {
    const entities = [ent({ id: 'e1', name: 'Wes Outlet', breaker_ids: ['b1'] })]
    const tags = [{ entityId: 'e1', tagNames: ['Needs Grounding', '2P'] }]
    const out = generateTaskCandidates(entities, tags, [])
    expect(out).toHaveLength(1)
    expect(out[0].taskType).toBe('Self-Ground')
    expect(out[0].notes).toMatch(/2-prong/)
  })

  it('skips entities that already have a matching OPEN task', () => {
    const entities = [ent({ id: 'e1', name: 'X' })] // unmapped
    const existing: TaskWithEntity[] = [{
      id: 't1', entity_id: 'e1', title: 'map', notes: null, task_type: 'Map Circuit',
      status: 'open', created_at: new Date(), updated_at: new Date(), completed_at: null,
      entity_name: 'X', entity_room: null
    }]
    expect(generateTaskCandidates(entities, [], existing)).toHaveLength(0)
  })

  it('a mapped, grounded entity yields nothing', () => {
    const entities = [ent({ id: 'e1', name: 'Fine', breaker_ids: ['b1'] })]
    expect(generateTaskCandidates(entities, [{ entityId: 'e1', tagNames: ['Self-Grounding'] }], [])).toHaveLength(0)
  })
})
