import type Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { z } from 'zod'
import {
  BreakerRepository,
  EntityRepository,
  PanelRepository,
  BackupRepository,
  TagRepository
} from '../src/main/db/repositories'

// ---- Plan schema --------------------------------------------------------

// Raw shapes (exported for MCP registerTool inputSchema, which wants a raw
// shape rather than a z.object).
export const PlanEntityShape = {
  name: z.string(),
  entity_type: z.string().default('outlet'),
  room: z.string().nullable().optional(),
  location: z.string().nullable().optional()
}
export const PlanEntitySchema = z.object(PlanEntityShape)

export const PanelBreakerShape = {
  position: z.number().int().positive(),
  position_slot: z.enum(['a', 'b']).nullable().optional(),
  breaker_type: z.enum(['single-pole', 'double-pole']).optional(),
  amperage: z.number().int().positive().optional(),
  label: z.string().nullable().optional(),
  status: z.enum(['active', 'spare']).default('active'),
  entities: z.array(PlanEntitySchema).default([])
}
export const PlanBreakerSchema = z.object(PanelBreakerShape)

export const PanelLinkShape = {
  // positions like "17b" / "19a" / "2"
  aPosition: z.string(),
  bPosition: z.string(),
  reason: z.string().optional()
}
export const PlanLinkSchema = z.object(PanelLinkShape)

export const PanelImportPlanSchema = z.object({
  breakers: z.array(PlanBreakerSchema),
  links: z.array(PlanLinkSchema).default([])
})

export type PanelImportPlan = z.infer<typeof PanelImportPlanSchema>
type PlanBreaker = z.infer<typeof PlanBreakerSchema>

// ---- Helpers ------------------------------------------------------------

function posKey(position: number, slot?: 'a' | 'b' | null): string {
  return `${position}${slot || ''}`
}

// Parses a position string like "17b" → { position: 17, slot: 'b' }.
function parsePos(s: string): { position: number; slot: 'a' | 'b' | null } {
  const m = s.trim().match(/^(\d+)([ab])?$/i)
  if (!m) throw new Error(`Invalid position "${s}"`)
  return { position: parseInt(m[1], 10), slot: (m[2]?.toLowerCase() as 'a' | 'b') || null }
}

// ---- Dry run ------------------------------------------------------------

export interface DryRunResult {
  panelId: string
  panelName: string
  summary: string
  breakersToCreate: string[]
  breakersToUpdate: string[]
  entitiesToCreate: Array<{ breaker: string; name: string; type: string; room?: string | null }>
  linksToCreate: string[]
  conflicts: string[]
  warnings: string[]
}

export function dryRunImport(db: Database.Database, panelId: string, plan: PanelImportPlan): DryRunResult {
  const panelRepo = new PanelRepository(db)
  const breakerRepo = new BreakerRepository(db)
  const panel = panelRepo.findById(panelId)
  if (!panel) throw new Error(`Panel ${panelId} not found.`)

  const existing = breakerRepo.listByPanel(panelId)
  const existingByPos = new Map(existing.map(b => [posKey(b.position, b.position_slot), b]))

  const breakersToCreate: string[] = []
  const breakersToUpdate: string[] = []
  const entitiesToCreate: DryRunResult['entitiesToCreate'] = []
  const conflicts: string[] = []
  const warnings: string[] = []

  for (const b of plan.breakers) {
    const key = posKey(b.position, b.position_slot)
    if (existingByPos.has(key)) {
      breakersToUpdate.push(key)
      conflicts.push(`Breaker ${key} already exists — its label/type will be updated.`)
    } else {
      breakersToCreate.push(key)
    }
    for (const e of b.entities) {
      entitiesToCreate.push({ breaker: key, name: e.name, type: e.entity_type, room: e.room })
    }
    if (b.status === 'active' && b.amperage === undefined && b.entities.length > 0) {
      warnings.push(`Breaker ${key} has no amperage — will default to 15A.`)
    }
  }

  const linksToCreate = plan.links.map(l => `${l.aPosition} ↔ ${l.bPosition}${l.reason ? ` (${l.reason})` : ''}`)

  const summary =
    `Into "${panel.name}": create ${breakersToCreate.length} breaker(s), ` +
    `update ${breakersToUpdate.length}, add ${entitiesToCreate.length} entit${entitiesToCreate.length === 1 ? 'y' : 'ies'}, ` +
    `link ${linksToCreate.length} double-pole pair(s).`

  return {
    panelId,
    panelName: panel.name,
    summary,
    breakersToCreate,
    breakersToUpdate,
    entitiesToCreate,
    linksToCreate,
    conflicts,
    warnings
  }
}

// ---- Apply --------------------------------------------------------------

export interface ApplyResult {
  summary: string
  backupPath: string
  breakersCreated: number
  breakersUpdated: number
  entitiesCreated: number
  linksCreated: number
}

// Writes the plan via repositories (all business rules apply), in a transaction,
// after auto-exporting a v3 backup. Existing breakers at a position are updated;
// new ones created. Entities are created and assigned. Double-pole links applied
// via the shared planner semantics (set both sides).
export function applyImport(
  db: Database.Database,
  panelId: string,
  plan: PanelImportPlan,
  backupDir: string
): ApplyResult {
  // 1) Auto-backup first (outside the write transaction)
  const backup = new BackupRepository(db).exportDatabase()
  const backupPath = `${backupDir.replace(/\/$/, '')}/map-my-panel-backup-pre-import-${backup.exportDate.replace(/[:.]/g, '-')}.json`
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')

  const breakerRepo = new BreakerRepository(db)
  const entityRepo = new EntityRepository(db)

  let breakersCreated = 0
  let breakersUpdated = 0
  let entitiesCreated = 0
  let linksCreated = 0

  const run = db.transaction(() => {
    const existing = breakerRepo.listByPanel(panelId)
    const byPos = new Map(existing.map(b => [posKey(b.position, b.position_slot), b.id]))

    // Positions that have tandem slots in the plan need a CONTAINER base row at
    // the bare position (position_slot=null, is_container=1, null amperage/type).
    // The slot breakers carry the real specs.
    const tandemPositions = new Set(
      plan.breakers.filter(b => b.position_slot).map(b => b.position)
    )
    for (const position of tandemPositions) {
      const bareKey = posKey(position, null)
      const existingBareId = byPos.get(bareKey)
      if (existingBareId) {
        // Convert an existing plain breaker at this position into a container.
        const row = existing.find(e => e.id === existingBareId)
        if (!row?.is_container) {
          breakerRepo.update(existingBareId, {
            is_container: true,
            breaker_type: null,
            amperage: null
          })
        }
      } else {
        const container = breakerRepo.create({
          panel_id: panelId,
          position,
          position_slot: null,
          is_container: true,
          breaker_type: null,
          amperage: null,
          status: 'active'
        })
        byPos.set(bareKey, container.id)
      }
    }

    // Breakers + their entities. Skip any plan entry that is a bare position
    // which is now a container (handled above) — only slot rows carry specs there.
    for (const b of plan.breakers) {
      if (!b.position_slot && tandemPositions.has(b.position)) continue

      const key = posKey(b.position, b.position_slot)
      let breakerId = byPos.get(key)

      if (breakerId) {
        // If the existing row at this bare position is actually a CONTAINER (the
        // panel has tandem slots here that the plan didn't account for), never
        // write amperage/breaker_type to it — that violates the container check
        // constraint. Just refresh the label and move on.
        const existingRow = existing.find(e => e.id === breakerId)
        if (!b.position_slot && existingRow?.is_container) {
          if (b.label !== undefined) breakerRepo.update(breakerId, { label: b.label })
          breakersUpdated++
          continue
        }
        breakerRepo.update(breakerId, {
          breaker_type: b.breaker_type || 'single-pole',
          amperage: b.amperage ?? 15,
          label: b.label ?? null,
          status: b.status
        })
        breakersUpdated++
      } else {
        const created = breakerRepo.create({
          panel_id: panelId,
          position: b.position,
          position_slot: b.position_slot ?? null,
          breaker_type: b.status === 'spare' ? 'single-pole' : b.breaker_type || 'single-pole',
          amperage: b.amperage ?? 15,
          label: b.label ?? null,
          status: b.status
        })
        breakerId = created.id
        byPos.set(key, breakerId)
        breakersCreated++
      }

      for (const e of b.entities) {
        entityRepo.create({
          panel_id: panelId,
          breaker_ids: [breakerId],
          entity_type: e.entity_type,
          name: e.name,
          room: e.room ?? null,
          location: e.location ?? null
        })
        entitiesCreated++
      }
    }

    // Double-pole links — set both sides to double-pole + cross-link, and
    // sync entities so an appliance spanning the pair (e.g. Range on 2+4) is
    // attached to BOTH breakers, matching the app's own behavior.
    for (const l of plan.links) {
      const a = parsePos(l.aPosition)
      const b = parsePos(l.bPosition)
      const aId = byPos.get(posKey(a.position, a.slot))
      const bId = byPos.get(posKey(b.position, b.slot))
      if (!aId || !bId) continue
      breakerRepo.update(aId, { breaker_type: 'double-pole', linked_breaker_id: bId })
      breakerRepo.update(bId, { breaker_type: 'double-pole', linked_breaker_id: aId })

      // Any entity on either half should be on both.
      const onEither = [...entityRepo.listByBreaker(aId), ...entityRepo.listByBreaker(bId)]
      const seen = new Set<string>()
      for (const ent of onEither) {
        if (seen.has(ent.id)) continue
        seen.add(ent.id)
        const ids = new Set(ent.breaker_ids)
        ids.add(aId)
        ids.add(bId)
        if (ids.size !== ent.breaker_ids.length) {
          entityRepo.update(ent.id, { breaker_ids: [...ids] })
        }
      }
      linksCreated++
    }
  })

  run()

  return {
    summary: `Created ${breakersCreated} breaker(s), updated ${breakersUpdated}, added ${entitiesCreated} entit${entitiesCreated === 1 ? 'y' : 'ies'}, linked ${linksCreated} pair(s).`,
    backupPath,
    breakersCreated,
    breakersUpdated,
    entitiesCreated,
    linksCreated
  }
}

// ---- Add entities (standalone; may be unmapped) -------------------------

export const AddEntityShape = {
  name: z.string(),
  entity_type: z.string().default('outlet'),
  room: z.string().nullable().optional(),
  // Physical locator and/or notes (shows in the UI). Notes fold in here.
  location: z.string().nullable().optional(),
  // Optional breaker to assign to, by position string ("12", "17b"). Omit to
  // leave the entity UNMAPPED (shows the sidebar warning until traced).
  breakerPosition: z.string().nullable().optional()
}
export const AddEntitySchema = z.object(AddEntityShape)
export type AddEntityInput = z.infer<typeof AddEntitySchema>

export interface AddEntitiesResult {
  summary: string
  backupPath: string
  created: number
  unmapped: number
}

// Creates entities (optionally unmapped) on a panel. Auto-backs-up first, runs
// in a transaction. Used for the "trace it later" items that have a room but no
// breaker yet, and for adding to an existing breaker by position.
export function addEntities(
  db: Database.Database,
  panelId: string,
  entities: AddEntityInput[],
  backupDir: string
): AddEntitiesResult {
  const backup = new BackupRepository(db).exportDatabase()
  const backupPath = `${backupDir.replace(/\/$/, '')}/map-my-panel-backup-pre-add-${backup.exportDate.replace(/[:.]/g, '-')}.json`
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')

  const breakerRepo = new BreakerRepository(db)
  const entityRepo = new EntityRepository(db)

  let created = 0
  let unmapped = 0

  const run = db.transaction(() => {
    const existing = breakerRepo.listByPanel(panelId)
    const byPos = new Map(existing.map(b => [posKey(b.position, b.position_slot), b.id]))

    for (const e of entities) {
      let breakerIds: string[] = []
      if (e.breakerPosition) {
        const p = parsePos(e.breakerPosition)
        const id = byPos.get(posKey(p.position, p.slot))
        if (id) breakerIds = [id]
      }
      if (breakerIds.length === 0) unmapped++

      entityRepo.create({
        panel_id: panelId,
        breaker_ids: breakerIds,
        entity_type: e.entity_type,
        name: e.name,
        room: e.room ?? null,
        location: e.location ?? null
      })
      created++
    }
  })

  run()

  return {
    summary: `Added ${created} entit${created === 1 ? 'y' : 'ies'} (${unmapped} unmapped).`,
    backupPath,
    created,
    unmapped
  }
}

// ---- Tagging ------------------------------------------------------------

// One tag assignment: a tag name applied to a target identified by EITHER an
// entity name OR a breaker position ("12", "17b"). Tag is created (scoped to
// the panel's property) if it doesn't exist yet.
export const TagAssignmentShape = {
  tag: z.string().describe('Tag name, e.g. "No Ground Wire", "Confirm Mapping", "Deprecated".'),
  entityName: z.string().nullable().optional().describe('Exact entity name to tag.'),
  breakerPosition: z.string().nullable().optional().describe('Breaker position to tag, e.g. "19b".'),
  // Optional metadata for creating a new tag
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional()
}
export const TagAssignmentSchema = z.object(TagAssignmentShape)
export type TagAssignment = z.infer<typeof TagAssignmentSchema>

export interface ApplyTagsResult {
  summary: string
  backupPath: string
  attached: number
  unresolved: string[]
}

export function applyTags(
  db: Database.Database,
  panelId: string,
  assignments: TagAssignment[],
  backupDir: string
): ApplyTagsResult {
  const backup = new BackupRepository(db).exportDatabase()
  const backupPath = `${backupDir.replace(/\/$/, '')}/map-my-panel-backup-pre-tags-${backup.exportDate.replace(/[:.]/g, '-')}.json`
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')

  const panelRepo = new PanelRepository(db)
  const breakerRepo = new BreakerRepository(db)
  const entityRepo = new EntityRepository(db)
  const tagRepo = new TagRepository(db)

  const panel = panelRepo.findById(panelId)
  if (!panel) throw new Error(`Panel ${panelId} not found.`)
  const propertyId = (panel as any).property_id as string

  let attached = 0
  const unresolved: string[] = []

  const run = db.transaction(() => {
    const breakers = breakerRepo.listByPanel(panelId)
    const entities = entityRepo.listByPanel(panelId)
    const propertyTags = tagRepo.listForProperty(propertyId)
    const tagByName = new Map(propertyTags.map(t => [t.name.toLowerCase(), t]))

    const resolveTag = (a: TagAssignment) => {
      const existing = tagByName.get(a.tag.toLowerCase())
      if (existing) return existing
      const created = tagRepo.create({
        property_id: propertyId,
        name: a.tag,
        color: a.color ?? null,
        icon: a.icon ?? null,
        description: a.description ?? null
      })
      tagByName.set(a.tag.toLowerCase(), created)
      return created
    }

    for (const a of assignments) {
      const tag = resolveTag(a)
      if (a.entityName) {
        const ent = entities.find(e => e.name.toLowerCase() === a.entityName!.toLowerCase())
        if (!ent) { unresolved.push(`entity "${a.entityName}"`); continue }
        tagRepo.attach(tag.id, 'entity', ent.id)
        attached++
      } else if (a.breakerPosition) {
        const p = parsePos(a.breakerPosition)
        const br = breakers.find(b => b.position === p.position && (b.position_slot || null) === p.slot)
        if (!br) { unresolved.push(`breaker "${a.breakerPosition}"`); continue }
        tagRepo.attach(tag.id, 'breaker', br.id)
        attached++
      } else {
        unresolved.push(`assignment for tag "${a.tag}" (no entityName or breakerPosition)`)
      }
    }
  })

  run()

  return {
    summary: `Attached ${attached} tag(s).${unresolved.length ? ` ${unresolved.length} unresolved.` : ''}`,
    backupPath,
    attached,
    unresolved
  }
}
