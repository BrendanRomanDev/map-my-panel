import { randomUUID } from 'crypto'
import { BaseRepository } from './BaseRepository'
import type { Tag, TagLink, CreateTagInput, UpdateTagInput, TargetType } from '../../../shared/types'

export class TagRepository extends BaseRepository<Tag, CreateTagInput, UpdateTagInput> {
  create(input: CreateTagInput): Tag {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, property_id, name, description, color, icon, condense, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      input.property_id || null,
      input.name,
      input.description || null,
      input.color || null,
      input.icon || null,
      input.condense ? 1 : 0,
      now,
      now
    )

    return this.findById(id)!
  }

  findById(id: string): Tag | null {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return this.mapRowToTag(row)
  }

  // Property-scoped tags plus global (property_id IS NULL) tags
  listForProperty(propertyId: string): Tag[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tags
      WHERE property_id = ? OR property_id IS NULL
      ORDER BY name COLLATE NOCASE ASC
    `)

    const rows = stmt.all(propertyId) as any[]

    return rows.map(row => this.mapRowToTag(row))
  }

  // Tags attached to a specific target (panel/breaker/entity/property)
  listForTarget(targetType: TargetType, targetId: string): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN tag_links l ON l.tag_id = t.id
      WHERE l.target_type = ? AND l.target_id = ?
      ORDER BY t.name COLLATE NOCASE ASC
    `)

    const rows = stmt.all(targetType, targetId) as any[]

    return rows.map(row => this.mapRowToTag(row))
  }

  update(id: string, input: UpdateTagInput): Tag | null {
    const existing = this.findById(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }

    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description)
    }

    if (input.color !== undefined) {
      updates.push('color = ?')
      values.push(input.color)
    }

    if (input.icon !== undefined) {
      updates.push('icon = ?')
      values.push(input.icon)
    }

    if (input.condense !== undefined) {
      updates.push('condense = ?')
      values.push(input.condense ? 1 : 0)
    }

    if (updates.length === 0) return existing

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    return this.findById(id)
  }

  delete(id: string): boolean {
    // tag_links cascade via FK ON DELETE CASCADE
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Attach a tag to a target. Idempotent: re-attaching is a no-op.
  attach(tagId: string, targetType: TargetType, targetId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tag_links (id, tag_id, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(randomUUID(), tagId, targetType, targetId, new Date().toISOString())
  }

  detach(tagId: string, targetType: TargetType, targetId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM tag_links
      WHERE tag_id = ? AND target_type = ? AND target_id = ?
    `)
    stmt.run(tagId, targetType, targetId)
  }

  listTargetsForTag(tagId: string): TagLink[] {
    const stmt = this.db.prepare('SELECT * FROM tag_links WHERE tag_id = ?')
    const rows = stmt.all(tagId) as any[]
    return rows.map(row => ({
      id: row.id,
      tag_id: row.tag_id,
      target_type: row.target_type,
      target_id: row.target_id,
      created_at: new Date(row.created_at)
    }))
  }

  // Remove all links pointing at a target — called when a panel/breaker/entity
  // is deleted (polymorphic links have no FK to cascade through).
  deleteLinksForTarget(targetType: TargetType, targetId: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM tag_links WHERE target_type = ? AND target_id = ?
    `)
    const result = stmt.run(targetType, targetId)
    return result.changes
  }

  // Default tags seeded for a newly created property. The migration backfills
  // properties that existed at migration time; this covers properties created
  // afterward (called from PropertyRepository.create). Idempotent per name.
  // Shape: [name, icon, color, condense]. Defaults are editable by the user.
  static readonly DEFAULT_TAGS: Array<{
    name: string
    icon: string
    color: string
    condense: boolean
  }> = [
    { name: 'No Ground Wire', icon: '🚫', color: 'red', condense: true },
    { name: 'Grounded to Box (Self-Grounding)', icon: '🔩', color: 'amber', condense: true },
    { name: 'Reverse Polarity', icon: '⚡', color: 'red', condense: true },
    { name: 'GFCI Protected', icon: '🛡️', color: 'green', condense: false },
    { name: 'AFCI Protected', icon: '🛡️', color: 'blue', condense: false }
  ]

  seedDefaultsForProperty(propertyId: string): void {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO tags (id, property_id, name, icon, color, condense, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const seed = this.db.transaction(() => {
      const now = new Date().toISOString()
      for (const t of TagRepository.DEFAULT_TAGS) {
        insert.run(randomUUID(), propertyId, t.name, t.icon, t.color, t.condense ? 1 : 0, now, now)
      }
    })
    seed()
  }

  private mapRowToTag(row: any): Tag {
    return {
      ...this.mapTimestamps(row),
      property_id: row.property_id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      condense: row.condense === 1
    } as Tag
  }
}
