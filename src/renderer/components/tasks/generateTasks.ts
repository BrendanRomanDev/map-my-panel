import type { Entity, TaskWithTarget } from '@shared/types'

export interface TaskCandidate {
  entityId: string
  entityName: string
  title: string
  taskType: string
  notes: string | null
}

// Pure: derive task suggestions from OBJECTIVE FACTS only — never from tags.
// The app stays unopinionated about electrical protocol; condition-based work
// (grounding, GFCI, etc.) is left to the user / the Claude agent (MCP), which
// can reason over tags and the user's own rules. The only thing the app itself
// asserts is documentation completeness:
//
//   - entity has no breaker OR no room  → suggest a "Map Circuit" task
//     (matches the two existing sidebar warnings: the no-breaker icon and the
//      "No room" group).
//
// Skips entities that already have an OPEN Map Circuit task (no dupes).
export function generateTaskCandidates(
  entities: Entity[],
  existingTasks: TaskWithTarget[]
): TaskCandidate[] {
  const openMapByEntity = new Set(
    existingTasks
      .filter(t => t.status === 'open' && t.task_type === 'Map Circuit' && t.target_type === 'entity')
      .map(t => t.target_id)
  )

  const out: TaskCandidate[] = []

  for (const e of entities) {
    const noBreaker = e.breaker_ids.length === 0
    const noRoom = !e.room || e.room.trim() === ''
    if (!(noBreaker || noRoom)) continue
    if (openMapByEntity.has(e.id)) continue

    const missing = [noBreaker ? 'breaker' : null, noRoom ? 'room' : null].filter(Boolean).join(' and ')
    out.push({
      entityId: e.id,
      entityName: e.name,
      title: `Map "${e.name}"`,
      taskType: 'Map Circuit',
      notes: `Missing ${missing}.${e.room ? ` Room: ${e.room}.` : ''}`
    })
  }
  return out
}
