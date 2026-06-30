import type { TaskWithTarget, Entity, Breaker } from '@shared/types'

// Two-level grouping for the Tasks view: a top-level group (room or breaker)
// containing entity sub-groups, each holding the tasks. Tasks that don't fit the
// axis land in explicit catch-all groups so nothing is ever hidden:
//   - 'No room'  / 'No breaker'  → entity tasks whose entity lacks that axis
//   - 'General Tasks'            → breaker/panel/property tasks (higher-level work)
//
// Pure + data-driven so it's testable and the component stays declarative.

export const GROUP_BY = { FLAT: 'flat', ROOM: 'room', BREAKER: 'breaker' } as const
export type GroupBy = (typeof GROUP_BY)[keyof typeof GROUP_BY]

export const NO_ROOM = 'No room'
export const NO_BREAKER = 'No breaker'
export const GENERAL = 'General Tasks'

// An entity sub-group. `entityId` is null for the loose bucket that holds a
// group's non-entity tasks (only used inside General Tasks / breaker-target rows).
export interface EntitySubgroup {
  entityId: string | null
  label: string
  tasks: TaskWithTarget[]
}

export interface TaskGroup {
  key: string
  label: string
  // Sort hint: catch-all groups (No room / No breaker / General) sink to the bottom.
  isCatchAll: boolean
  subgroups: EntitySubgroup[]
  taskCount: number
  openCount: number
}

interface BuildArgs {
  tasks: TaskWithTarget[]
  entities: Entity[]
  breakers: Breaker[]
  groupBy: GroupBy
  search: string
}

function breakerLabel(b: Breaker): string {
  return b.label || `Breaker ${b.position}${b.position_slot || ''}`
}

function matchesSearch(t: TaskWithTarget, q: string): boolean {
  if (!q) return true
  const hay = `${t.title} ${t.task_type || ''} ${t.target_label} ${t.target_room || ''}`.toLowerCase()
  return hay.includes(q)
}

export function buildTaskGroups({ tasks, entities, breakers, groupBy, search }: BuildArgs): TaskGroup[] {
  const q = search.trim().toLowerCase()
  const entityById = new Map(entities.map(e => [e.id, e]))
  const breakerById = new Map(breakers.map(b => [b.id, b]))

  // Flat: no grouping — one synthetic group holding every matching task as a
  // loose list. The view renders flat groups headerless.
  if (groupBy === GROUP_BY.FLAT) {
    const matched = tasks.filter(t => matchesSearch(t, q))
    if (matched.length === 0) return []
    return [{
      key: '__flat__',
      label: '',
      isCatchAll: false,
      subgroups: [{ entityId: null, label: '', tasks: matched }],
      taskCount: matched.length,
      openCount: matched.filter(t => t.status === 'open').length
    }]
  }

  // groupKey -> { label, isCatchAll, entityId -> subgroup }
  const groups = new Map<string, { label: string; isCatchAll: boolean; subs: Map<string, EntitySubgroup> }>()

  const ensureGroup = (key: string, label: string, isCatchAll: boolean) => {
    if (!groups.has(key)) groups.set(key, { label, isCatchAll, subs: new Map() })
    return groups.get(key)!
  }
  const addToSub = (
    g: { subs: Map<string, EntitySubgroup> },
    entityId: string | null,
    subLabel: string,
    t: TaskWithTarget
  ) => {
    const subKey = entityId ?? '__loose__'
    if (!g.subs.has(subKey)) g.subs.set(subKey, { entityId, label: subLabel, tasks: [] })
    g.subs.get(subKey)!.tasks.push(t)
  }

  for (const t of tasks) {
    if (!matchesSearch(t, q)) continue

    if (t.target_type === 'entity') {
      const entity = entityById.get(t.target_id)
      if (groupBy === GROUP_BY.ROOM) {
        const room = entity?.room?.trim()
        const g = room ? ensureGroup(`room:${room}`, room, false) : ensureGroup('__noroom__', NO_ROOM, true)
        addToSub(g, t.target_id, t.target_label, t)
      } else {
        // By breaker: an entity's breaker is its first mapped breaker.
        const bId = entity?.breaker_ids?.[0]
        const breaker = bId ? breakerById.get(bId) : undefined
        const g = breaker
          ? ensureGroup(`breaker:${breaker.id}`, breakerLabel(breaker), false)
          : ensureGroup('__nobreaker__', NO_BREAKER, true)
        addToSub(g, t.target_id, t.target_label, t)
      }
    } else if (t.target_type === 'breaker' && groupBy === GROUP_BY.BREAKER) {
      // A task ON a breaker, in the By-Breaker view, groups under that breaker
      // itself (loose — it's not an entity).
      const g = ensureGroup(`breaker:${t.target_id}`, t.target_label, false)
      addToSub(g, null, t.target_label, t)
    } else {
      // Everything else (breaker target in room view; panel/property anywhere)
      // is higher-level work → General Tasks, listed loose.
      const g = ensureGroup('__general__', GENERAL, true)
      addToSub(g, null, t.target_label, t)
    }
  }

  const result: TaskGroup[] = [...groups.entries()].map(([key, g]) => {
    const subgroups = [...g.subs.values()].sort((a, b) => {
      // loose bucket last, then alphabetical
      if ((a.entityId === null) !== (b.entityId === null)) return a.entityId === null ? 1 : -1
      return a.label.localeCompare(b.label)
    })
    const allTasks = subgroups.flatMap(s => s.tasks)
    return {
      key,
      label: g.label,
      isCatchAll: g.isCatchAll,
      subgroups,
      taskCount: allTasks.length,
      openCount: allTasks.filter(t => t.status === 'open').length
    }
  })

  // Real groups alphabetical; catch-alls (No room/No breaker/General) at the bottom.
  return result.sort((a, b) => {
    if (a.isCatchAll !== b.isCatchAll) return a.isCatchAll ? 1 : -1
    return a.label.localeCompare(b.label)
  })
}
