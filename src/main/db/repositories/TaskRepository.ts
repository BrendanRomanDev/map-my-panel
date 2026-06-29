import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type {
  Task,
  TaskWithEntity,
  CreateTaskInput,
  UpdateTaskInput,
  TaskTemplate,
  CreateTaskTemplateInput
} from '../../../shared/types'
import { TagRepository } from './TagRepository'
import { HistoryRepository } from './HistoryRepository'

// Entity-linked to-dos with optional tag-wiring rules. Tasks cascade-delete with
// their entity (FK). Completion rules + templates make the app's machinery
// configurable without baking in any electrical opinions.
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
           (id, entity_id, title, notes, task_type, status,
            on_create_tag_id, on_complete_remove_tag_ids, on_complete_add_tag_ids, on_complete_log_history,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.entity_id,
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

    // On-create: apply the wired tag to the entity (idempotent).
    if (input.on_create_tag_id) {
      new TagRepository(this.db).attach(input.on_create_tag_id, 'entity', input.entity_id)
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

  // Complete + apply the wired rules in one transaction. The caller may override
  // which side-effects run (so the confirm UI's checkboxes win); defaults to the
  // task's stored rules. propertyId is needed for any history event.
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
      for (const tagId of removeTagIds) tagRepo.detach(tagId, 'entity', task.entity_id)
      for (const tagId of addTagIds) tagRepo.attach(tagId, 'entity', task.entity_id)
      if (logHistory) {
        new HistoryRepository(this.db).createEvent({
          property_id: propertyId,
          occurred_on: new Date().toISOString().slice(0, 10),
          notes: opts?.historyNote || task.title,
          targets: [{ target_type: 'entity', target_id: task.entity_id }]
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

  listForEntity(entityId: string): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE entity_id = ? ORDER BY status ASC, created_at DESC')
      .all(entityId) as any[]
    return rows.map(r => this.mapRow(r))
  }

  listForPanel(panelId: string): TaskWithEntity[] {
    const rows = this.db
      .prepare(
        `SELECT t.*, e.name AS entity_name, e.room AS entity_room
         FROM tasks t INNER JOIN entities e ON e.id = t.entity_id
         WHERE e.panel_id = ?
         ORDER BY t.status ASC, e.room ASC, t.created_at DESC`
      )
      .all(panelId) as any[]
    return rows.map(r => ({ ...this.mapRow(r), entity_name: r.entity_name, entity_room: r.entity_room }))
  }

  openCountForEntity(entityId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS c FROM tasks WHERE entity_id = ? AND status = 'open'")
      .get(entityId) as { c: number }
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

  // Bulk: create one task per entity from a template. {entityName} in the
  // title_template is substituted per entity. Returns created task ids.
  createFromTemplate(templateId: string, entityIds: string[]): string[] {
    const tplRow = this.db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId)
    if (!tplRow) return []
    const tpl = this.mapTemplate(tplRow)
    const ids: string[] = []
    const run = this.db.transaction(() => {
      for (const entityId of entityIds) {
        const ent = this.db.prepare('SELECT name FROM entities WHERE id = ?').get(entityId) as { name: string } | undefined
        const title = tpl.title_template.replace(/\{entityName\}/g, ent?.name || 'entity')
        const t = this.create({
          entity_id: entityId,
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

  // ---- Mappers ------------------------------------------------------------

  private parseIds(v: any): string[] {
    try { return JSON.parse(v || '[]') } catch { return [] }
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      entity_id: row.entity_id,
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
