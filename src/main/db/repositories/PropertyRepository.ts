import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import { PanelRepository } from './PanelRepository'
import type { Property, CreatePropertyInput, UpdatePropertyInput } from '../../../shared/types'

export class PropertyRepository extends BaseRepository<Property, CreatePropertyInput, UpdatePropertyInput> {
  create(input: CreatePropertyInput): Property {
    const id = `prop_${randomUUID().replace(/-/g, '').substring(0, 16)}`
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    // Set as current if no other properties exist
    const existingCount = this.db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }
    const isCurrent = existingCount.count === 0 ? 1 : 0

    stmt.run(id, input.name, '[]', isCurrent, now, now)

    return this.findById(id)!
  }

  findById(id: string): Property | null {
    const stmt = this.db.prepare('SELECT * FROM properties WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return this.mapRowToProperty(row)
  }

  findAll(): Property[] {
    const stmt = this.db.prepare('SELECT * FROM properties ORDER BY created_at DESC')
    const rows = stmt.all() as any[]

    return rows.map(row => this.mapRowToProperty(row))
  }

  getCurrentOrNull(): Property | null {
    const stmt = this.db.prepare('SELECT * FROM properties WHERE is_current = 1 LIMIT 1')
    const row = stmt.get() as any

    if (!row) {
      // If no current property, get the first one
      const fallbackStmt = this.db.prepare('SELECT * FROM properties ORDER BY created_at DESC LIMIT 1')
      const fallbackRow = fallbackStmt.get() as any

      if (!fallbackRow) return null

      // Set it as current
      this.setAsCurrent(fallbackRow.id)
      return this.mapRowToProperty(fallbackRow)
    }

    return this.mapRowToProperty(row)
  }

  setAsCurrent(id: string): Property | null {
    const property = this.findById(id)
    if (!property) return null

    // Unset all other properties as current
    this.db.prepare('UPDATE properties SET is_current = 0').run()

    // Set this one as current
    this.db.prepare('UPDATE properties SET is_current = 1, updated_at = ? WHERE id = ?')
      .run(Date.now(), id)

    return this.findById(id)
  }

  update(id: string, input: UpdatePropertyInput): Property | null {
    const existing = this.findById(id)
    if (!existing) return null

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE properties SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...values)

    return this.findById(id)
  }

  delete(id: string): boolean {
    // Check if this is the last property
    const allProperties = this.findAll()
    if (allProperties.length === 1) {
      // Don't delete the last property
      return false
    }

    // If deleting current property, set another as current
    const property = this.findById(id)
    if (property?.is_current) {
      const otherProperty = allProperties.find(p => p.id !== id)
      if (otherProperty) {
        this.setAsCurrent(otherProperty.id)
      }
    }

    const stmt = this.db.prepare('DELETE FROM properties WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }

  addCustomEntityType(propertyId: string, newType: string): Property | null {
    const property = this.findById(propertyId)
    if (!property) return null

    // Check if type already exists (case-insensitive)
    const lowerNewType = newType.toLowerCase()
    const existingTypes = property.custom_entity_types.map(t => t.toLowerCase())

    if (existingTypes.includes(lowerNewType)) {
      return property // Type already exists, return unchanged
    }

    // Add new type
    const updatedTypes = [...property.custom_entity_types, newType]
    const stmt = this.db.prepare(`
      UPDATE properties SET custom_entity_types = ?, updated_at = ? WHERE id = ?
    `)

    stmt.run(JSON.stringify(updatedTypes), Date.now(), propertyId)

    return this.findById(propertyId)
  }

  removeCustomEntityType(propertyId: string, typeToRemove: string): Property | null {
    const property = this.findById(propertyId)
    if (!property) return null

    // Remove the type from the array (case-sensitive match)
    const updatedTypes = property.custom_entity_types.filter(t => t !== typeToRemove)

    const stmt = this.db.prepare(`
      UPDATE properties SET custom_entity_types = ?, updated_at = ? WHERE id = ?
    `)

    stmt.run(JSON.stringify(updatedTypes), Date.now(), propertyId)

    return this.findById(propertyId)
  }

  private mapRowToProperty(row: any): Property {
    return {
      id: row.id,
      name: row.name,
      custom_entity_types: JSON.parse(row.custom_entity_types || '[]'),
      is_current: Boolean(row.is_current),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
