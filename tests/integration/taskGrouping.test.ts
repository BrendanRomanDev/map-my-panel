import { describe, it, expect } from 'vitest'
import { buildTaskGroups, GROUP_BY, NO_ROOM, NO_BREAKER, GENERAL } from '../../src/renderer/components/tasks/taskGrouping'
import type { TaskWithTarget, Entity, Breaker } from '../../src/shared/types'

const entity = (over: Partial<Entity> & { id: string }): Entity => ({
  panel_id: 'p', breaker_ids: [], entity_type: 'outlet', name: over.id, room: null,
  location: null, metadata: {}, created_at: new Date(), updated_at: new Date(), ...over
})
const breaker = (id: string, position: number): Breaker => ({
  id, panel_id: 'p', position, position_slot: null, breaker_type: 'single-pole',
  amperage: 20, label: null, status: 'active', is_powered: true, is_container: false,
  linked_breaker_id: null, created_at: new Date(), updated_at: new Date()
})
const task = (over: Partial<TaskWithTarget> & { id: string; target_type: TaskWithTarget['target_type']; target_id: string }): TaskWithTarget => ({
  title: over.id, notes: null, task_type: null, status: 'open',
  on_create_tag_id: null, on_complete_remove_tag_ids: [], on_complete_add_tag_ids: [], on_complete_log_history: false,
  created_at: new Date(), updated_at: new Date(), completed_at: null,
  target_label: over.target_id, target_room: null, target_amperage: null, ...over
})

const ENTITIES = [
  entity({ id: 'e1', name: 'Outlet A', room: 'Office', breaker_ids: ['b1'] }),
  entity({ id: 'e2', name: 'Outlet B', room: 'Office', breaker_ids: ['b1'] }),
  entity({ id: 'e3', name: 'Roomless', room: null, breaker_ids: [] }) // no room, no breaker
]
const BREAKERS = [breaker('b1', 5)]

describe('buildTaskGroups — flat', () => {
  it('returns one synthetic group with all matching tasks, no headers', () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', target_type: 'entity', target_id: 'e1', target_room: 'Office' }),
        task({ id: 't2', target_type: 'breaker', target_id: 'b1' })
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.FLAT, search: ''
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].taskCount).toBe(2)
    expect(groups[0].subgroups).toHaveLength(1)
    expect(groups[0].subgroups[0].entityId).toBeNull()
  })

  it('flat respects search', () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', title: 'self-ground', target_type: 'entity', target_id: 'e1' }),
        task({ id: 't2', title: 'replace', target_type: 'entity', target_id: 'e2' })
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.FLAT, search: 'replace'
    })
    expect(groups[0].taskCount).toBe(1)
  })
})

describe('buildTaskGroups — by room', () => {
  it('rolls entity tasks under their room, then under their entity', () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', target_type: 'entity', target_id: 'e1', target_label: 'Outlet A', target_room: 'Office' }),
        task({ id: 't2', target_type: 'entity', target_id: 'e1', target_label: 'Outlet A', target_room: 'Office' }),
        task({ id: 't3', target_type: 'entity', target_id: 'e2', target_label: 'Outlet B', target_room: 'Office' })
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.ROOM, search: ''
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Office')
    expect(groups[0].taskCount).toBe(3)
    // two entity subgroups: Outlet A (2 tasks), Outlet B (1)
    expect(groups[0].subgroups.map(s => s.label).sort()).toEqual(['Outlet A', 'Outlet B'])
    expect(groups[0].subgroups.find(s => s.label === 'Outlet A')!.tasks).toHaveLength(2)
  })

  it("puts a room-less entity's tasks in the 'No room' catch-all (at the bottom)", () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', target_type: 'entity', target_id: 'e1', target_room: 'Office' }),
        task({ id: 't2', target_type: 'entity', target_id: 'e3' }) // e3 has no room
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.ROOM, search: ''
    })
    expect(groups.map(g => g.label)).toEqual(['Office', NO_ROOM]) // catch-all last
    expect(groups.find(g => g.label === NO_ROOM)!.isCatchAll).toBe(true)
  })

  it("puts breaker/panel/property tasks in 'General Tasks'", () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', target_type: 'breaker', target_id: 'b1', target_label: 'Breaker 5' }),
        task({ id: 't2', target_type: 'property', target_id: 'prop', target_label: 'House' })
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.ROOM, search: ''
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe(GENERAL)
    expect(groups[0].taskCount).toBe(2)
    // loose bucket: no entity sub-headers
    expect(groups[0].subgroups.every(s => s.entityId === null)).toBe(true)
  })
})

describe('buildTaskGroups — by breaker', () => {
  it('groups entity tasks under their breaker', () => {
    const groups = buildTaskGroups({
      tasks: [task({ id: 't1', target_type: 'entity', target_id: 'e1' })],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.BREAKER, search: ''
    })
    expect(groups[0].label).toBe('Breaker 5')
  })

  it("puts breaker-less entity tasks in 'No breaker'", () => {
    const groups = buildTaskGroups({
      tasks: [task({ id: 't1', target_type: 'entity', target_id: 'e3' })], // e3 has no breaker
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.BREAKER, search: ''
    })
    expect(groups[0].label).toBe(NO_BREAKER)
    expect(groups[0].isCatchAll).toBe(true)
  })

  it('a task ON a breaker groups under that breaker (loose, not an entity)', () => {
    const groups = buildTaskGroups({
      tasks: [task({ id: 't1', target_type: 'breaker', target_id: 'b1', target_label: 'Breaker 5' })],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.BREAKER, search: ''
    })
    expect(groups[0].label).toBe('Breaker 5')
    expect(groups[0].subgroups[0].entityId).toBeNull()
  })
})

describe('buildTaskGroups — search', () => {
  it('filters by title / entity label', () => {
    const groups = buildTaskGroups({
      tasks: [
        task({ id: 't1', title: 'Self-ground it', target_type: 'entity', target_id: 'e1', target_label: 'Outlet A', target_room: 'Office' }),
        task({ id: 't2', title: 'Replace faceplate', target_type: 'entity', target_id: 'e2', target_label: 'Outlet B', target_room: 'Office' })
      ],
      entities: ENTITIES, breakers: BREAKERS, groupBy: GROUP_BY.ROOM, search: 'faceplate'
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].taskCount).toBe(1)
    expect(groups[0].subgroups[0].tasks[0].title).toBe('Replace faceplate')
  })
})
