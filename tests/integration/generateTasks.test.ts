import { describe, it, expect } from 'vitest'
import { generateTaskCandidates } from '../../src/renderer/components/tasks/generateTasks'
import type { Entity, TaskWithEntity } from '../../src/shared/types'

function ent(over: Partial<Entity> & { id: string; name: string }): Entity {
  return {
    panel_id: 'p', breaker_ids: ['b1'], entity_type: 'outlet', room: 'Kitchen',
    location: null, metadata: {}, created_at: new Date(), updated_at: new Date(),
    ...over
  }
}

describe('generateTaskCandidates (objective facts only)', () => {
  it('suggests Map Circuit when an entity has no breaker', () => {
    const out = generateTaskCandidates([ent({ id: 'e1', name: 'Mystery', breaker_ids: [] })], [])
    expect(out).toHaveLength(1)
    expect(out[0].taskType).toBe('Map Circuit')
    expect(out[0].notes).toMatch(/breaker/)
  })

  it('suggests Map Circuit when an entity has no room', () => {
    const out = generateTaskCandidates([ent({ id: 'e1', name: 'Roomless', room: null })], [])
    expect(out).toHaveLength(1)
    expect(out[0].notes).toMatch(/room/)
  })

  it('notes both when breaker AND room are missing', () => {
    const out = generateTaskCandidates([ent({ id: 'e1', name: 'X', breaker_ids: [], room: '' })], [])
    expect(out[0].notes).toMatch(/breaker and room/)
  })

  it('a fully-documented entity (breaker + room) yields nothing', () => {
    expect(generateTaskCandidates([ent({ id: 'e1', name: 'Fine' })], [])).toHaveLength(0)
  })

  it('does NOT inspect tags — grounding is no longer an app concern', () => {
    // Even a "needs grounding"-ish entity that's fully documented gets nothing.
    const out = generateTaskCandidates([ent({ id: 'e1', name: 'Grounded?', breaker_ids: ['b1'], room: 'Garage' })], [])
    expect(out).toHaveLength(0)
  })

  it('skips entities that already have an open Map Circuit task', () => {
    const entities = [ent({ id: 'e1', name: 'X', breaker_ids: [] })]
    const existing: TaskWithEntity[] = [{
      id: 't1', entity_id: 'e1', title: 'map', notes: null, task_type: 'Map Circuit',
      status: 'open', created_at: new Date(), updated_at: new Date(), completed_at: null,
      entity_name: 'X', entity_room: null
    }]
    expect(generateTaskCandidates(entities, existing)).toHaveLength(0)
  })
})
