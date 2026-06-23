import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import type {
  HistoryEvent,
  HistoryEventWithDetails,
  RolledUpHistoryEvent,
  CreateHistoryEventInput,
  UpdateHistoryEventInput,
  EventType,
  CreateEventTypeInput,
  UpdateEventTypeInput,
  TargetType,
  TargetRef,
  Tag
} from '../../../shared/types'

// Manages history events, their polymorphic links, and event types.
// Not a BaseRepository subclass: it spans three tables and returns composed
// detail views, so the single-entity CRUD shape doesn't fit.
export class HistoryRepository {
  protected db: Database.Database

  constructor(database: Database.Database) {
    this.db = database
  }

  // ---- Events -------------------------------------------------------------

  // One event + N links in a single transaction. With no targets, the event
  // auto-attaches to its property (standalone note).
  createEvent(input: CreateHistoryEventInput): HistoryEventWithDetails {
    const id = randomUUID()
    const now = new Date().toISOString()

    const targets: TargetRef[] =
      input.targets && input.targets.length > 0
        ? input.targets
        : [{ target_type: 'property', target_id: input.property_id }]

    const insertEvent = this.db.prepare(`
      INSERT INTO history_events
        (id, property_id, event_type_id, title, notes, occurred_on, tag_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertLink = this.db.prepare(`
      INSERT OR IGNORE INTO event_links (id, event_id, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const run = this.db.transaction(() => {
      insertEvent.run(
        id,
        input.property_id,
        input.event_type_id || null,
        input.title || null,
        input.notes || null,
        input.occurred_on,
        input.tag_id || null,
        now,
        now
      )
      for (const t of targets) {
        insertLink.run(randomUUID(), id, t.target_type, t.target_id, now)
      }
    })
    run()

    return this.findByIdWithDetails(id)!
  }

  updateEvent(id: string, input: UpdateHistoryEventInput): HistoryEventWithDetails | null {
    const existing = this.findById(id)
    if (!existing) return null

    const updates: string[] = []
    const values: any[] = []

    if (input.event_type_id !== undefined) {
      updates.push('event_type_id = ?')
      values.push(input.event_type_id)
    }
    if (input.title !== undefined) {
      updates.push('title = ?')
      values.push(input.title)
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?')
      values.push(input.notes)
    }
    if (input.occurred_on !== undefined) {
      updates.push('occurred_on = ?')
      values.push(input.occurred_on)
    }
    if (input.tag_id !== undefined) {
      updates.push('tag_id = ?')
      values.push(input.tag_id)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)
      this.db.prepare(`UPDATE history_events SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    return this.findByIdWithDetails(id)
  }

  deleteEvent(id: string): boolean {
    // event_links cascade via FK
    const result = this.db.prepare('DELETE FROM history_events WHERE id = ?').run(id)
    return result.changes > 0
  }

  findById(id: string): HistoryEvent | null {
    const row = this.db.prepare('SELECT * FROM history_events WHERE id = ?').get(id) as any
    if (!row) return null
    return this.mapRowToEvent(row)
  }

  findByIdWithDetails(id: string): HistoryEventWithDetails | null {
    const event = this.findById(id)
    if (!event) return null
    return this.decorate(event)
  }

  // ---- Links (mutable target set) ----------------------------------------

  addTargets(eventId: string, targets: TargetRef[]): void {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO event_links (id, event_id, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    const run = this.db.transaction(() => {
      const now = new Date().toISOString()
      for (const t of targets) {
        insert.run(randomUUID(), eventId, t.target_type, t.target_id, now)
      }
    })
    run()
  }

  // Remove a target link. An event must keep >= 1 link; removing the last one
  // is blocked (delete the event instead).
  removeTarget(eventId: string, targetType: TargetType, targetId: string): boolean {
    const count = this.db
      .prepare('SELECT COUNT(*) as count FROM event_links WHERE event_id = ?')
      .get(eventId) as { count: number }
    if (count.count <= 1) return false

    const result = this.db
      .prepare('DELETE FROM event_links WHERE event_id = ? AND target_type = ? AND target_id = ?')
      .run(eventId, targetType, targetId)
    return result.changes > 0
  }

  listTargets(eventId: string): TargetRef[] {
    const rows = this.db
      .prepare('SELECT target_type, target_id FROM event_links WHERE event_id = ?')
      .all(eventId) as any[]
    return rows.map(r => ({ target_type: r.target_type, target_id: r.target_id }))
  }

  // ---- Queries ------------------------------------------------------------

  listForTarget(targetType: TargetType, targetId: string): HistoryEventWithDetails[] {
    const rows = this.db
      .prepare(
        `SELECT e.* FROM history_events e
         INNER JOIN event_links l ON l.event_id = e.id
         WHERE l.target_type = ? AND l.target_id = ?
         ORDER BY e.occurred_on DESC, e.logged_at DESC`
      )
      .all(targetType, targetId) as any[]
    return rows.map(row => this.decorate(this.mapRowToEvent(row)))
  }

  // Rolled-up breaker view: events attached directly to the breaker PLUS
  // events on entities assigned to it (entities store breaker_ids as JSON).
  // Each result is marked `via` = 'direct' or the source entity. Deduped by
  // event id (direct wins), newest first.
  listForBreakerRollup(breakerId: string): RolledUpHistoryEvent[] {
    // Direct breaker events
    const directRows = this.db
      .prepare(
        `SELECT e.* FROM history_events e
         INNER JOIN event_links l ON l.event_id = e.id
         WHERE l.target_type = 'breaker' AND l.target_id = ?`
      )
      .all(breakerId) as any[]

    // Events on entities assigned to this breaker
    const entityRows = this.db
      .prepare(
        `SELECT ev.*, ent.id AS via_entity_id, ent.name AS via_entity_name
         FROM entities ent, json_each(ent.breaker_ids) AS b
         INNER JOIN event_links l ON l.target_type = 'entity' AND l.target_id = ent.id
         INNER JOIN history_events ev ON ev.id = l.event_id
         WHERE b.value = ?`
      )
      .all(breakerId) as any[]

    const byId = new Map<string, RolledUpHistoryEvent>()

    for (const row of directRows) {
      byId.set(row.id, { ...this.decorate(this.mapRowToEvent(row)), via: 'direct' })
    }
    for (const row of entityRows) {
      if (byId.has(row.id)) continue // direct attachment wins
      byId.set(row.id, {
        ...this.decorate(this.mapRowToEvent(row)),
        via: { entityId: row.via_entity_id, entityName: row.via_entity_name }
      })
    }

    return [...byId.values()].sort((a, b) => {
      if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? 1 : -1
      return a.logged_at < b.logged_at ? 1 : -1
    })
  }

  listForProperty(propertyId: string): HistoryEventWithDetails[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM history_events
         WHERE property_id = ?
         ORDER BY occurred_on DESC, logged_at DESC`
      )
      .all(propertyId) as any[]
    return rows.map(row => this.decorate(this.mapRowToEvent(row)))
  }

  // ---- Event types --------------------------------------------------------

  listEventTypes(propertyId: string): EventType[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM event_types
         WHERE property_id = ? OR property_id IS NULL
         ORDER BY name COLLATE NOCASE ASC`
      )
      .all(propertyId) as any[]
    return rows.map(row => this.mapRowToEventType(row))
  }

  createEventType(input: CreateEventTypeInput): EventType {
    const id = `evt_${randomUUID().replace(/-/g, '').substring(0, 16)}`
    this.db
      .prepare('INSERT INTO event_types (id, property_id, name, created_at) VALUES (?, ?, ?, ?)')
      .run(id, input.property_id || null, input.name, new Date().toISOString())
    return this.findEventTypeById(id)!
  }

  updateEventType(id: string, input: UpdateEventTypeInput): EventType | null {
    if (input.name !== undefined) {
      this.db.prepare('UPDATE event_types SET name = ? WHERE id = ?').run(input.name, id)
    }
    return this.findEventTypeById(id)
  }

  deleteEventType(id: string): boolean {
    // history_events.event_type_id is ON DELETE SET NULL — events survive
    const result = this.db.prepare('DELETE FROM event_types WHERE id = ?').run(id)
    return result.changes > 0
  }

  findEventTypeById(id: string): EventType | null {
    const row = this.db.prepare('SELECT * FROM event_types WHERE id = ?').get(id) as any
    if (!row) return null
    return this.mapRowToEventType(row)
  }

  // ---- Mappers / helpers --------------------------------------------------

  private decorate(event: HistoryEvent): HistoryEventWithDetails {
    let eventTypeName: string | null = null
    if (event.event_type_id) {
      const et = this.db
        .prepare('SELECT name FROM event_types WHERE id = ?')
        .get(event.event_type_id) as { name: string } | undefined
      eventTypeName = et?.name ?? null
    }

    let tag: Tag | null = null
    if (event.tag_id) {
      const tagRow = this.db.prepare('SELECT * FROM tags WHERE id = ?').get(event.tag_id) as any
      if (tagRow) {
        tag = {
          id: tagRow.id,
          property_id: tagRow.property_id,
          name: tagRow.name,
          description: tagRow.description,
          color: tagRow.color,
          icon: tagRow.icon,
          condense: tagRow.condense === 1,
          created_at: new Date(tagRow.created_at),
          updated_at: new Date(tagRow.updated_at)
        }
      }
    }

    return {
      ...event,
      event_type_name: eventTypeName,
      tag,
      targets: this.listTargets(event.id)
    }
  }

  private mapRowToEvent(row: any): HistoryEvent {
    return {
      id: row.id,
      property_id: row.property_id,
      event_type_id: row.event_type_id,
      title: row.title,
      notes: row.notes,
      occurred_on: row.occurred_on,
      logged_at: new Date(row.logged_at),
      tag_id: row.tag_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  private mapRowToEventType(row: any): EventType {
    return {
      id: row.id,
      property_id: row.property_id,
      name: row.name,
      created_at: new Date(row.created_at)
    }
  }
}
