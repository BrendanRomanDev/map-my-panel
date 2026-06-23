import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import type {
  Breaker,
  BreakerWithEntityCount,
  CreateBreakerInput,
  UpdateBreakerInput
} from '../../../shared/types'

export class BreakerRepository extends BaseRepository<Breaker, CreateBreakerInput, UpdateBreakerInput> {
  create(input: CreateBreakerInput): Breaker {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO breakers (id, panel_id, position, position_slot, breaker_type, amperage, label, status, is_powered, is_container, linked_breaker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      input.panel_id,
      input.position,
      input.position_slot || null,
      input.breaker_type || null,
      input.amperage || null,
      input.label || null,
      input.status || 'active',
      input.is_powered !== undefined ? (input.is_powered ? 1 : 0) : 1,
      input.is_container !== undefined ? (input.is_container ? 1 : 0) : 0,
      input.linked_breaker_id || null,
      now,
      now
    )

    return this.findById(id)!
  }

  createBatch(inputs: CreateBreakerInput[]): Breaker[] {
    const insert = this.db.prepare(`
      INSERT INTO breakers (id, panel_id, position, position_slot, breaker_type, amperage, label, status, is_powered, is_container, linked_breaker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = this.db.transaction((inputs: CreateBreakerInput[]) => {
      const ids: string[] = []
      const now = new Date().toISOString()

      for (const input of inputs) {
        const id = randomUUID()
        insert.run(
          id,
          input.panel_id,
          input.position,
          input.position_slot || null,
          input.breaker_type || null,
          input.amperage || null,
          input.label || null,
          input.status || 'active',
          input.is_powered !== undefined ? (input.is_powered ? 1 : 0) : 1,
          input.is_container !== undefined ? (input.is_container ? 1 : 0) : 0,
          input.linked_breaker_id || null,
          now,
          now
        )
        ids.push(id)
      }

      return ids
    })

    const ids = insertMany(inputs)

    // Return all created breakers
    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`SELECT * FROM breakers WHERE id IN (${placeholders})`)
    const rows = stmt.all(...ids) as any[]

    return rows.map(row => this.mapRowToBreaker(row))
  }

  findById(id: string): Breaker | null {
    const stmt = this.db.prepare('SELECT * FROM breakers WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return this.mapRowToBreaker(row)
  }

  listByPanel(panelId: string): BreakerWithEntityCount[] {
    const stmt = this.db.prepare(`
      SELECT
        b.*,
        COUNT(DISTINCT e.id) as entity_count
      FROM breakers b
      LEFT JOIN entities e ON EXISTS (
        SELECT 1 FROM json_each(e.breaker_ids) WHERE value = b.id
      )
      WHERE b.panel_id = ?
      GROUP BY b.id
      ORDER BY b.position ASC
    `)

    const rows = stmt.all(panelId) as any[]

    return rows.map(row => ({
      ...this.mapRowToBreaker(row),
      entity_count: row.entity_count
    }))
  }

  update(id: string, input: UpdateBreakerInput): Breaker | null {
    const existing = this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.position_slot !== undefined) {
      updates.push('position_slot = ?')
      values.push(input.position_slot)
    }

    if (input.breaker_type !== undefined) {
      updates.push('breaker_type = ?')
      values.push(input.breaker_type)
    }

    if (input.amperage !== undefined) {
      updates.push('amperage = ?')
      values.push(input.amperage)
    }

    if (input.label !== undefined) {
      updates.push('label = ?')
      values.push(input.label)
    }

    if (input.status !== undefined) {
      updates.push('status = ?')
      values.push(input.status)
    }

    if (input.is_powered !== undefined) {
      updates.push('is_powered = ?')
      values.push(input.is_powered ? 1 : 0)
    }

    if (input.is_container !== undefined) {
      updates.push('is_container = ?')
      values.push(input.is_container ? 1 : 0)
    }

    if (input.linked_breaker_id !== undefined) {
      updates.push('linked_breaker_id = ?')
      values.push(input.linked_breaker_id)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE breakers SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...values)

    // Handle bidirectional linking for double-pole breakers
    if (input.linked_breaker_id !== undefined) {
      const oldLinkedBreakerId = existing.linked_breaker_id
      const newLinkedBreakerId = input.linked_breaker_id

      // If we had an old link, remove the reverse link
      if (oldLinkedBreakerId && oldLinkedBreakerId !== newLinkedBreakerId) {
        const oldLinkedBreaker = this.findById(oldLinkedBreakerId)
        if (oldLinkedBreaker && oldLinkedBreaker.linked_breaker_id === id) {
          const unlinkStmt = this.db.prepare(`
            UPDATE breakers SET linked_breaker_id = ?, updated_at = ? WHERE id = ?
          `)
          unlinkStmt.run(null, now, oldLinkedBreakerId)
        }
      }

      // If we have a new link, set the reverse link
      if (newLinkedBreakerId) {
        const newLinkedBreaker = this.findById(newLinkedBreakerId)
        if (newLinkedBreaker) {
          // Only set reverse link if it's not already set or if it points to us
          if (!newLinkedBreaker.linked_breaker_id || newLinkedBreaker.linked_breaker_id === id) {
            const linkStmt = this.db.prepare(`
              UPDATE breakers SET linked_breaker_id = ?, updated_at = ? WHERE id = ?
            `)
            linkStmt.run(id, now, newLinkedBreakerId)
          }
        }
      }
    }

    return this.findById(id)
  }

  delete(id: string): boolean {
    // First, unlink any breaker that was linked to this one
    const existing = this.findById(id)
    if (existing?.linked_breaker_id) {
      const linkedBreaker = this.findById(existing.linked_breaker_id)
      if (linkedBreaker && linkedBreaker.linked_breaker_id === id) {
        const unlinkStmt = this.db.prepare(`
          UPDATE breakers SET linked_breaker_id = ?, updated_at = ? WHERE id = ?
        `)
        unlinkStmt.run(null, new Date().toISOString(), existing.linked_breaker_id)
      }
    }

    // Clean up polymorphic tag/history links (no FK to cascade through)
    this.db.prepare(`DELETE FROM tag_links WHERE target_type = 'breaker' AND target_id = ?`).run(id)
    this.db.prepare(`DELETE FROM event_links WHERE target_type = 'breaker' AND target_id = ?`).run(id)

    const stmt = this.db.prepare('DELETE FROM breakers WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }

  deleteAllByPanel(panelId: string): number {
    const stmt = this.db.prepare('DELETE FROM breakers WHERE panel_id = ?')
    const result = stmt.run(panelId)

    return result.changes
  }

  private mapRowToBreaker(row: any): Breaker {
    return {
      ...this.mapTimestamps(row),
      is_powered: Boolean(row.is_powered),
      is_container: Boolean(row.is_container)
    } as Breaker
  }
}
