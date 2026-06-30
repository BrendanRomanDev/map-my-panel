import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type {
  Task,
  TaskWithTarget,
  CreateTaskInput,
  UpdateTaskInput,
  TaskTemplate,
  CreateTaskTemplateInput,
  TargetType
} from '../../../shared/types'
import { TagRepository } from './TagRepository'
import { HistoryRepository } from './HistoryRepository'
import { deriveEntityAmperage, breakerAmperageMap } from '../../../shared/entityAmperage'

// Polymorphic to-dos: a task targets any (target_type, target_id) — panel,
// breaker, entity, or the property itself — mirroring tags/history. No FK on
// target_id; cleanup rides the polymorphic delete triggers. Completion rules +
// templates make the machinery configurable without baking in any electrical
// opinions; tag side-effects attach to the task's OWN target.
export class TaskRepository {
  protected db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  // ---- Tasks --------------------------------------------------------------

  create(input: CreateTaskInput): Task {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO tasks
           (id, target_type, target_id, title, notes, task_type, status,
            on_create_tag_id, on_complete_remove_tag_ids, on_complete_add_tag_ids, on_complete_log_history,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.target_type,
        input.target_id,
        input.title,
        input.notes || null,
        input.task_type || null,
        input.on_create_tag_id || null,
        JSON.stringify(input.on_complete_remove_tag_ids || []),
        JSON.stringify(input.on_complete_add_tag_ids || []),
        input.on_complete_log_history ? 1 : 0,
        now,
        now
      )

    // On-create: apply the wired tag to the task's target (idempotent).
    if (input.on_create_tag_id) {
      new TagRepository(this.db).attach(input.on_create_tag_id, input.target_type, input.target_id)
    }

    return this.findById(id)!
  }

  findById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    return row ? this.mapRow(row) : null
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    const existing = this.findById(id)
    if (!existing) return null
    const updates: string[] = []
    const values: any[] = []
    if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title) }
    if (input.notes !== undefined) { updates.push('notes = ?'); values.push(input.notes) }
    if (input.task_type !== undefined) { updates.push('task_type = ?'); values.push(input.task_type) }
    if (updates.length === 0) return existing
    updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
    this.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  }

  // Plain complete (no rule side-effects).
  complete(id: string): Task | null {
    const now = new Date().toISOString()
    this.db
      .prepare("UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, id)
    return this.findById(id)
  }

  // Complete + apply the wired rules in one transaction. Tag changes + the
  // optional history event land on the task's OWN target (entity/breaker/panel/
  // property). The caller may override which side-effects run (so the confirm
  // UI's checkboxes win); defaults to the task's stored rules. propertyId is
  // needed for any history event.
  completeWithRules(
    id: string,
    propertyId: string,
    opts?: {
      removeTagIds?: string[]
      addTagIds?: string[]
      logHistory?: boolean
      historyNote?: string
    }
  ): Task | null {
    const task = this.findById(id)
    if (!task) return null

    const removeTagIds = opts?.removeTagIds ?? task.on_complete_remove_tag_ids
    const addTagIds = opts?.addTagIds ?? task.on_complete_add_tag_ids
    const logHistory = opts?.logHistory ?? task.on_complete_log_history

    const tagRepo = new TagRepository(this.db)
    const run = this.db.transaction(() => {
      for (const tagId of removeTagIds) tagRepo.detach(tagId, task.target_type, task.target_id)
      for (const tagId of addTagIds) tagRepo.attach(tagId, task.target_type, task.target_id)
      if (logHistory) {
        new HistoryRepository(this.db).createEvent({
          property_id: propertyId,
          occurred_on: new Date().toISOString().slice(0, 10),
          notes: opts?.historyNote || task.title,
          targets: [{ target_type: task.target_type, target_id: task.target_id }]
        })
      }
      this.complete(id)
    })
    run()
    return this.findById(id)
  }

  reopen(id: string): Task | null {
    const now = new Date().toISOString()
    this.db
      .prepare("UPDATE tasks SET status = 'open', completed_at = NULL, updated_at = ? WHERE id = ?")
      .run(now, id)
    return this.findById(id)
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0
  }

  listForTarget(targetType: TargetType, targetId: string): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE target_type = ? AND target_id = ? ORDER BY status ASC, created_at DESC')
      .all(targetType, targetId) as any[]
    return rows.map(r => this.mapRow(r))
  }

  // All tasks across a property: property-level tasks + every panel on the
  // property + their breakers + their entities. Each row carries a resolved
  // target_label (and target_room for entities) so the view needs no extra
  // lookups. This is the property-wide Tasks view.
  listForProperty(propertyId: string): TaskWithTarget[] {
    const rows = this.db
      .prepare(
        `SELECT t.*,
           CASE t.target_type
             WHEN 'property' THEN pr.name
             WHEN 'panel'    THEN pa.name
             WHEN 'breaker'  THEN COALESCE(b.label, 'Breaker ' || b.position || COALESCE(b.position_slot, ''))
             WHEN 'entity'   THEN e.name
           END AS target_label,
           CASE WHEN t.target_type = 'entity' THEN e.room ELSE NULL END AS target_room,
           CASE WHEN t.target_type = 'entity' THEN e.breaker_ids ELSE NULL END AS entity_breaker_ids,
           CASE WHEN t.target_type = 'breaker' THEN b.amperage ELSE NULL END AS breaker_amperage
         FROM tasks t
         LEFT JOIN properties pr ON t.target_type = 'property' AND pr.id = t.target_id
         LEFT JOIN panels     pa ON t.target_type = 'panel'    AND pa.id = t.target_id
         LEFT JOIN breakers   b  ON t.target_type = 'breaker'  AND b.id  = t.target_id
         LEFT JOIN entities   e  ON t.target_type = 'entity'   AND e.id  = t.target_id
         WHERE
           (t.target_type = 'property' AND t.target_id = @propertyId)
           OR (t.target_type = 'panel'   AND pa.property_id = @propertyId)
           OR (t.target_type = 'breaker' AND b.panel_id IN (SELECT id FROM panels WHERE property_id = @propertyId))
           OR (t.target_type = 'entity'  AND e.panel_id  IN (SELECT id FROM panels WHERE property_id = @propertyId))
         ORDER BY t.status ASC, t.created_at DESC`
      )
      .all({ propertyId }) as any[]

    // Amperage map for entity-targeted tasks: an entity's amperage is derived
    // from its breaker(s), never stored. Look up all breakers on the property
    // once, then derive per entity-target.
    const breakerRows = this.db
      .prepare(
        `SELECT id, amperage FROM breakers
         WHERE panel_id IN (SELECT id FROM panels WHERE property_id = ?)`
      )
      .all(propertyId) as { id: string; amperage: number | null }[]
    const breakersById = breakerAmperageMap(breakerRows)

    return rows.map(r => {
      let amperage: number | null = null
      if (r.target_type === 'breaker') {
        amperage = r.breaker_amperage ?? null
      } else if (r.target_type === 'entity') {
        amperage = deriveEntityAmperage(this.parseIds(r.entity_breaker_ids), breakersById)
      }
      return {
        ...this.mapRow(r),
        target_label: r.target_label || '(deleted)',
        target_room: r.target_room ?? null,
        target_amperage: amperage
      }
    })
  }

  openCountForTarget(targetType: TargetType, targetId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS c FROM tasks WHERE target_type = ? AND target_id = ? AND status = 'open'")
      .get(targetType, targetId) as { c: number }
    return row.c
  }

  // ---- Templates ----------------------------------------------------------

  listTemplates(propertyId: string): TaskTemplate[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM task_templates
         WHERE property_id = ? OR property_id IS NULL
         ORDER BY name COLLATE NOCASE ASC`
      )
      .all(propertyId) as any[]
    return rows.map(r => this.mapTemplate(r))
  }

  createTemplate(input: CreateTaskTemplateInput): TaskTemplate {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO task_templates
           (id, property_id, name, task_type, title_template, notes,
            on_create_tag_id, on_complete_remove_tag_ids, on_complete_add_tag_ids, on_complete_log_history, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.property_id || null,
        input.name,
        input.task_type || null,
        input.title_template,
        input.notes || null,
        input.on_create_tag_id || null,
        JSON.stringify(input.on_complete_remove_tag_ids || []),
        JSON.stringify(input.on_complete_add_tag_ids || []),
        input.on_complete_log_history ? 1 : 0,
        new Date().toISOString()
      )
    return this.mapTemplate(this.db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id))
  }

  deleteTemplate(id: string): boolean {
    return this.db.prepare('DELETE FROM task_templates WHERE id = ?').run(id).changes > 0
  }

  // Bulk: create one task per target from a template. {entityName} in the
  // title_template is substituted with each target's resolved label. Returns
  // created task ids. Targets are (target_type, target_id) pairs so a template
  // can fan out across entities, breakers, etc.
  createFromTemplate(templateId: string, targets: { target_type: TargetType; target_id: string }[]): string[] {
    const tplRow = this.db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId)
    if (!tplRow) return []
    const tpl = this.mapTemplate(tplRow)
    const ids: string[] = []
    const run = this.db.transaction(() => {
      for (const target of targets) {
        const label = this.labelForTarget(target.target_type, target.target_id)
        const title = tpl.title_template.replace(/\{entityName\}/g, label)
        const t = this.create({
          target_type: target.target_type,
          target_id: target.target_id,
          title,
          notes: tpl.notes,
          task_type: tpl.task_type,
          on_create_tag_id: tpl.on_create_tag_id,
          on_complete_remove_tag_ids: tpl.on_complete_remove_tag_ids,
          on_complete_add_tag_ids: tpl.on_complete_add_tag_ids,
          on_complete_log_history: tpl.on_complete_log_history
        })
        ids.push(t.id)
      }
    })
    run()
    return ids
  }

  // ---- Helpers ------------------------------------------------------------

  private labelForTarget(targetType: TargetType, targetId: string): string {
    if (targetType === 'entity') {
      const r = this.db.prepare('SELECT name FROM entities WHERE id = ?').get(targetId) as { name: string } | undefined
      return r?.name || 'entity'
    }
    if (targetType === 'panel') {
      const r = this.db.prepare('SELECT name FROM panels WHERE id = ?').get(targetId) as { name: string } | undefined
      return r?.name || 'panel'
    }
    if (targetType === 'breaker') {
      const r = this.db.prepare('SELECT label, position, position_slot FROM breakers WHERE id = ?').get(targetId) as
        | { label: string | null; position: number; position_slot: string | null }
        | undefined
      if (!r) return 'breaker'
      return r.label || `Breaker ${r.position}${r.position_slot || ''}`
    }
    const r = this.db.prepare('SELECT name FROM properties WHERE id = ?').get(targetId) as { name: string } | undefined
    return r?.name || 'property'
  }

  private parseIds(v: any): string[] {
    try { return JSON.parse(v || '[]') } catch { return [] }
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      target_type: row.target_type,
      target_id: row.target_id,
      title: row.title,
      notes: row.notes,
      task_type: row.task_type,
      status: row.status,
      on_create_tag_id: row.on_create_tag_id ?? null,
      on_complete_remove_tag_ids: this.parseIds(row.on_complete_remove_tag_ids),
      on_complete_add_tag_ids: this.parseIds(row.on_complete_add_tag_ids),
      on_complete_log_history: row.on_complete_log_history === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : null
    }
  }

  private mapTemplate(row: any): TaskTemplate {
    return {
      id: row.id,
      property_id: row.property_id ?? null,
      name: row.name,
      task_type: row.task_type,
      title_template: row.title_template,
      notes: row.notes,
      on_create_tag_id: row.on_create_tag_id ?? null,
      on_complete_remove_tag_ids: this.parseIds(row.on_complete_remove_tag_ids),
      on_complete_add_tag_ids: this.parseIds(row.on_complete_add_tag_ids),
      on_complete_log_history: row.on_complete_log_history === 1,
      created_at: new Date(row.created_at)
    }
  }
}
