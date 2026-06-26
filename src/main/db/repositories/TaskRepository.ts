import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type { Task, TaskWithEntity, CreateTaskInput, UpdateTaskInput } from '../../../shared/types'

// Entity-linked to-dos. Tasks cascade-delete with their entity (FK).
export class TaskRepository {
  protected db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  create(input: CreateTaskInput): Task {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO tasks (id, entity_id, title, notes, task_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
      )
      .run(id, input.entity_id, input.title, input.notes || null, input.task_type || null, now, now)
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

  complete(id: string): Task | null {
    const now = new Date().toISOString()
    this.db
      .prepare("UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, id)
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

  // All tasks for entities on a panel, joined with entity name/room.
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

  private mapRow(row: any): Task {
    return {
      id: row.id,
      entity_id: row.entity_id,
      title: row.title,
      notes: row.notes,
      task_type: row.task_type,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : null
    }
  }
}
