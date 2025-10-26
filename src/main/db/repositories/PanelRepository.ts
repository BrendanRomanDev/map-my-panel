import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import type { Panel, CreatePanelInput, UpdatePanelInput } from '../../../shared/types'

export class PanelRepository extends BaseRepository<Panel, CreatePanelInput, UpdatePanelInput> {
  create(input: CreatePanelInput): Panel {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO panels (id, name, total_positions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(id, input.name, input.total_positions, now, now)

    return this.findById(id)!
  }

  findById(id: string): Panel | null {
    const stmt = this.db.prepare('SELECT * FROM panels WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return this.mapRowToPanel(row)
  }

  findAll(): Panel[] {
    const stmt = this.db.prepare('SELECT * FROM panels ORDER BY created_at DESC')
    const rows = stmt.all() as any[]

    return rows.map(row => this.mapRowToPanel(row))
  }

  getCurrentOrNull(): Panel | null {
    const stmt = this.db.prepare('SELECT * FROM panels ORDER BY created_at DESC LIMIT 1')
    const row = stmt.get() as any

    if (!row) return null

    return this.mapRowToPanel(row)
  }

  update(id: string, input: UpdatePanelInput): Panel | null {
    const existing = this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.total_positions !== undefined) {
      updates.push('total_positions = ?')
      values.push(input.total_positions)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE panels SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...values)

    return this.findById(id)
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM panels WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }

  private mapRowToPanel(row: any): Panel {
    return this.mapTimestamps(row) as Panel
  }
}
