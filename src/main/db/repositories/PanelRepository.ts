import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import { EntityRepository } from './EntityRepository'
import { BreakerRepository } from './BreakerRepository'
import type { Panel, CreatePanelInput, UpdatePanelInput } from '../../../shared/types'

export class PanelRepository extends BaseRepository<Panel, CreatePanelInput, UpdatePanelInput> {
  create(input: CreatePanelInput): Panel {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, input.property_id, input.name, input.total_positions, input.main_breaker_amperage, now, now)

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
    // Get the current property's first panel
    const stmt = this.db.prepare(`
      SELECT p.* FROM panels p
      INNER JOIN properties prop ON p.property_id = prop.id
      WHERE prop.is_current = 1
      ORDER BY p.created_at ASC
      LIMIT 1
    `)
    const row = stmt.get() as any

    if (!row) {
      // Fallback: get any panel
      const fallbackStmt = this.db.prepare('SELECT * FROM panels ORDER BY created_at DESC LIMIT 1')
      const fallbackRow = fallbackStmt.get() as any
      return fallbackRow ? this.mapRowToPanel(fallbackRow) : null
    }

    return this.mapRowToPanel(row)
  }

  findByProperty(propertyId: string): Panel[] {
    const stmt = this.db.prepare('SELECT * FROM panels WHERE property_id = ? ORDER BY created_at ASC')
    const rows = stmt.all(propertyId) as any[]

    return rows.map(row => this.mapRowToPanel(row))
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

    if (input.main_breaker_amperage !== undefined) {
      updates.push('main_breaker_amperage = ?')
      values.push(input.main_breaker_amperage)
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
    // FK cascades delete child breakers/entities; AFTER DELETE triggers
    // (migration 012) clean up their polymorphic tag/event links and prune
    // orphaned events — at the DB layer, so it can't be bypassed.
    const result = this.db.prepare('DELETE FROM panels WHERE id = ?').run(id)
    return result.changes > 0
  }

  resetPanel(panelId: string): { entitiesDeleted: number; breakersDeleted: number} {
    const entityRepo = new EntityRepository(this.db)
    const breakerRepo = new BreakerRepository(this.db)

    // Atomic. Triggers handle polymorphic-link cleanup as rows are deleted.
    const resetTransaction = this.db.transaction(() => {
      const entitiesDeleted = entityRepo.deleteAllByPanel(panelId)
      const breakersDeleted = breakerRepo.deleteAllByPanel(panelId)

      return { entitiesDeleted, breakersDeleted }
    })

    return resetTransaction()
  }

  private mapRowToPanel(row: any): Panel {
    return this.mapTimestamps(row) as Panel
  }
}
