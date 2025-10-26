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
      INSERT INTO breakers (id, panel_id, position, position_slot, breaker_type, amperage, label, status, linked_breaker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      input.panel_id,
      input.position,
      input.position_slot || null,
      input.breaker_type,
      input.amperage,
      input.label || null,
      input.status || 'active',
      input.linked_breaker_id || null,
      now,
      now
    )

    return this.findById(id)!
  }

  createBatch(inputs: CreateBreakerInput[]): Breaker[] {
    const insert = this.db.prepare(`
      INSERT INTO breakers (id, panel_id, position, position_slot, breaker_type, amperage, label, status, linked_breaker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          input.breaker_type,
          input.amperage,
          input.label || null,
          input.status || 'active',
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
        COUNT(e.id) as entity_count
      FROM breakers b
      LEFT JOIN entities e ON e.breaker_id = b.id
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

    return this.findById(id)
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM breakers WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }

  private mapRowToBreaker(row: any): Breaker {
    return this.mapTimestamps(row) as Breaker
  }
}
