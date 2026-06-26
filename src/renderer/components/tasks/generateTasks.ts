import type { Entity, Tag, TaskWithEntity } from '@shared/types'

export interface TaskCandidate {
  entityId: string
  entityName: string
  title: string
  taskType: string
  notes: string | null
}

// Pure: derive task suggestions from the app's own signals —
//  - entities with NO breaker  → "Map Circuit"
//  - entities tagged "Needs Grounding" → "Self-Ground"
// Skips entities that already have an OPEN task of that type (no dupes).
export function generateTaskCandidates(
  entities: Entity[],
  tagsForTarget: { entityId: string; tagNames: string[] }[],
  existingTasks: TaskWithEntity[]
): TaskCandidate[] {
  const openByEntityType = new Set(
    existingTasks.filter(t => t.status === 'open').map(t => `${t.entity_id}::${t.task_type || ''}`)
  )
  const hasOpen = (entityId: string, type: string) => openByEntityType.has(`${entityId}::${type}`)

  const tagMap = new Map(tagsForTarget.map(x => [x.entityId, x.tagNames.map(n => n.toLowerCase())]))
  const out: TaskCandidate[] = []

  for (const e of entities) {
    // Unmapped → Map Circuit
    if (e.breaker_ids.length === 0 && !hasOpen(e.id, 'Map Circuit')) {
      out.push({
        entityId: e.id,
        entityName: e.name,
        title: `Map circuit — find the breaker for "${e.name}"`,
        taskType: 'Map Circuit',
        notes: e.room ? `Room: ${e.room}` : null
      })
    }
    // Needs Grounding → Self-Ground
    const tagNames = tagMap.get(e.id) || []
    if (tagNames.includes('needs grounding') && !hasOpen(e.id, 'Self-Ground')) {
      const twoProng = tagNames.includes('2p')
      out.push({
        entityId: e.id,
        entityName: e.name,
        title: `Self-ground "${e.name}"`,
        taskType: 'Self-Ground',
        notes: twoProng ? 'Currently 2-prong/ungrounded — install a self-grounding box (note amperage).' : 'Ungrounded — install a self-grounding box or GFCI.'
      })
    }
  }
  return out
}
