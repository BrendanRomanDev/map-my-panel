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
    const del = this.db.transaction(() => {
      // Breakers/entities cascade via FK, but their polymorphic tag/history
      // links don't (no FK on target_id) — clean them up first.
      this.cleanupPolymorphicLinksForPanel(id)
      const result = this.db.prepare('DELETE FROM panels WHERE id = ?').run(id)
      return result.changes > 0
    })
    return del()
  }

  resetPanel(panelId: string): { entitiesDeleted: number; breakersDeleted: number} {
    const entityRepo = new EntityRepository(this.db)
    const breakerRepo = new BreakerRepository(this.db)

    // Use transaction to ensure atomic operation
    const resetTransaction = this.db.transaction(() => {
      // Clean polymorphic links before bulk-deleting (bypasses per-row cleanup)
      this.cleanupPolymorphicLinksForPanel(panelId)
      const entitiesDeleted = entityRepo.deleteAllByPanel(panelId)
      const breakersDeleted = breakerRepo.deleteAllByPanel(panelId)

      return { entitiesDeleted, breakersDeleted }
    })

    return resetTransaction()
  }

  // Removes tag_links + event_links for a panel and all its breakers/entities,
  // then prunes any history_events left with zero links. Called on panel
  // delete/reset, where FK cascades remove the rows but not the polymorphic links.
  private cleanupPolymorphicLinksForPanel(panelId: string): void {
    for (const table of ['tag_links', 'event_links']) {
      // The panel itself
      this.db.prepare(`DELETE FROM ${table} WHERE target_type = 'panel' AND target_id = ?`).run(panelId)
      // Its breakers
      this.db.prepare(
        `DELETE FROM ${table} WHERE target_type = 'breaker' AND target_id IN (
           SELECT id FROM breakers WHERE panel_id = ?
         )`
      ).run(panelId)
      // Its entities
      this.db.prepare(
        `DELETE FROM ${table} WHERE target_type = 'entity' AND target_id IN (
           SELECT id FROM entities WHERE panel_id = ?
         )`
      ).run(panelId)
    }

    // Prune history events that now have no links left (orphans).
    this.db.prepare(
      `DELETE FROM history_events
       WHERE id NOT IN (SELECT DISTINCT event_id FROM event_links)`
    ).run()
  }

  private mapRowToPanel(row: any): Panel {
    return this.mapTimestamps(row) as Panel
  }
}
