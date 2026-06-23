import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import type {
  Entity,
  EntitiesByRoom,
  CreateEntityInput,
  UpdateEntityInput
} from '../../../shared/types'

export class EntityRepository extends BaseRepository<Entity, CreateEntityInput, UpdateEntityInput> {
  create(input: CreateEntityInput): Entity {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room, location, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      input.panel_id,
      JSON.stringify(input.breaker_ids || []),
      input.entity_type,
      input.name,
      input.room || null,
      input.location || null,
      JSON.stringify(input.metadata || {}),
      now,
      now
    )

    return this.findById(id)!
  }

  createBatch(inputs: CreateEntityInput[]): Entity[] {
    const insert = this.db.prepare(`
      INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room, location, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = this.db.transaction((inputs: CreateEntityInput[]) => {
      const ids: string[] = []
      const now = new Date().toISOString()

      for (const input of inputs) {
        const id = randomUUID()
        insert.run(
          id,
          input.panel_id,
          JSON.stringify(input.breaker_ids || []),
          input.entity_type,
          input.name,
          input.room || null,
          input.location || null,
          JSON.stringify(input.metadata || {}),
          now,
          now
        )
        ids.push(id)
      }

      return ids
    })

    const ids = insertMany(inputs)

    // Return all created entities
    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`SELECT * FROM entities WHERE id IN (${placeholders})`)
    const rows = stmt.all(...ids) as any[]

    return rows.map(row => this.mapRowToEntity(row))
  }

  findById(id: string): Entity | null {
    const stmt = this.db.prepare('SELECT * FROM entities WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return this.mapRowToEntity(row)
  }

  listByPanel(panelId: string): Entity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities
      WHERE panel_id = ?
      ORDER BY name ASC
    `)

    const rows = stmt.all(panelId) as any[]

    return rows.map(row => this.mapRowToEntity(row))
  }

  listByBreaker(breakerId: string): Entity[] {
    const stmt = this.db.prepare(`
      SELECT e.* FROM entities e, json_each(e.breaker_ids) AS breaker
      WHERE breaker.value = ?
      ORDER BY e.name ASC
    `)

    const rows = stmt.all(breakerId) as any[]

    return rows.map(row => this.mapRowToEntity(row))
  }

  listUnmapped(panelId: string): Entity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities
      WHERE panel_id = ? AND breaker_ids = '[]'
      ORDER BY room, name ASC
    `)

    const rows = stmt.all(panelId) as any[]

    return rows.map(row => this.mapRowToEntity(row))
  }

  groupByRoom(panelId: string): EntitiesByRoom[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities
      WHERE panel_id = ?
      ORDER BY room, name ASC
    `)

    const rows = stmt.all(panelId) as any[]
    const entities = rows.map(row => this.mapRowToEntity(row))

    // Group by room
    const grouped = new Map<string | null, Entity[]>()

    for (const entity of entities) {
      const room = entity.room
      if (!grouped.has(room)) {
        grouped.set(room, [])
      }
      grouped.get(room)!.push(entity)
    }

    // Convert to array of objects
    return Array.from(grouped.entries()).map(([room, entities]) => ({
      room,
      entities
    }))
  }

  search(panelId: string, query: string): Entity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entities
      WHERE panel_id = ?
      AND (
        name LIKE ? COLLATE NOCASE
        OR room LIKE ? COLLATE NOCASE
        OR location LIKE ? COLLATE NOCASE
      )
      ORDER BY name ASC
    `)

    const searchPattern = `%${query}%`
    const rows = stmt.all(panelId, searchPattern, searchPattern, searchPattern) as any[]

    return rows.map(row => this.mapRowToEntity(row))
  }

  assignToBreaker(entityIds: string[], breakerId: string): void {
    const now = new Date().toISOString()

    // For each entity, add the breakerId to its breaker_ids array if not already present
    const updateStmt = this.db.prepare(`
      UPDATE entities
      SET breaker_ids = json_insert(breaker_ids, '$[#]', ?),
          updated_at = ?
      WHERE id = ?
      AND NOT EXISTS (
        SELECT 1 FROM json_each(breaker_ids) WHERE value = ?
      )
    `)

    const transaction = this.db.transaction((entityIds: string[], breakerId: string) => {
      for (const entityId of entityIds) {
        updateStmt.run(breakerId, now, entityId, breakerId)
      }
    })

    transaction(entityIds, breakerId)
  }

  unassignFromBreaker(entityIds: string[]): void {
    const placeholders = entityIds.map(() => '?').join(',')
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE entities
      SET breaker_ids = '[]', updated_at = ?
      WHERE id IN (${placeholders})
    `)

    stmt.run(now, ...entityIds)
  }

  update(id: string, input: UpdateEntityInput): Entity | null {
    const existing = this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.breaker_ids !== undefined) {
      updates.push('breaker_ids = ?')
      values.push(JSON.stringify(input.breaker_ids))
    }

    if (input.entity_type !== undefined) {
      updates.push('entity_type = ?')
      values.push(input.entity_type)
    }

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.room !== undefined) {
      updates.push('room = ?')
      values.push(input.room)
    }

    if (input.location !== undefined) {
      updates.push('location = ?')
      values.push(input.location)
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?')
      values.push(JSON.stringify(input.metadata))
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE entities SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...values)

    return this.findById(id)
  }

  delete(id: string): boolean {
    // Clean up polymorphic tag/history links (no FK to cascade through)
    this.db.prepare(`DELETE FROM tag_links WHERE target_type = 'entity' AND target_id = ?`).run(id)
    this.db.prepare(`DELETE FROM event_links WHERE target_type = 'entity' AND target_id = ?`).run(id)

    const stmt = this.db.prepare('DELETE FROM entities WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }

  deleteAllByPanel(panelId: string): number {
    const stmt = this.db.prepare('DELETE FROM entities WHERE panel_id = ?')
    const result = stmt.run(panelId)

    return result.changes
  }

  // Room management methods
  getAllRooms(panelId: string): Array<{ room: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT room, COUNT(*) as count
      FROM entities
      WHERE panel_id = ? AND room IS NOT NULL AND room != ''
      GROUP BY room
      ORDER BY room ASC
    `)

    const rows = stmt.all(panelId) as any[]
    return rows.map(row => ({ room: row.room, count: row.count }))
  }

  deleteRoom(panelId: string, roomName: string): number {
    const stmt = this.db.prepare(`
      UPDATE entities
      SET room = NULL, updated_at = ?
      WHERE panel_id = ? AND room = ?
    `)

    const now = new Date().toISOString()
    const result = stmt.run(now, panelId, roomName)

    return result.changes
  }

  renameRoom(panelId: string, oldName: string, newName: string): number {
    const stmt = this.db.prepare(`
      UPDATE entities
      SET room = ?, updated_at = ?
      WHERE panel_id = ? AND room = ?
    `)

    const now = new Date().toISOString()
    const result = stmt.run(newName, now, panelId, oldName)

    return result.changes
  }

  // Type management methods
  getAllEntityTypes(panelId: string): Array<{ entity_type: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT entity_type, COUNT(*) as count
      FROM entities
      WHERE panel_id = ?
      GROUP BY entity_type
      ORDER BY entity_type ASC
    `)

    const rows = stmt.all(panelId) as any[]
    return rows.map(row => ({ entity_type: row.entity_type, count: row.count }))
  }

  changeEntityType(panelId: string, oldType: string, newType: string): number {
    const stmt = this.db.prepare(`
      UPDATE entities
      SET entity_type = ?, updated_at = ?
      WHERE panel_id = ? AND entity_type = ?
    `)

    const now = new Date().toISOString()
    const result = stmt.run(newType, now, panelId, oldType)

    return result.changes
  }

  private mapRowToEntity(row: any): Entity {
    return {
      ...this.mapTimestamps(row),
      breaker_ids: this.parseJsonField(row.breaker_ids) || [],
      metadata: this.parseJsonField(row.metadata)
    } as Entity
  }
}
