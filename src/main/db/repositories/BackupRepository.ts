import type Database from 'better-sqlite3'
import type { Property, Panel, Breaker, Entity } from '../../../shared/types'

// V1.0 backup format (legacy - panels had custom_entity_types)
export interface BackupDataV1 {
  version: '1.0'
  exportDate: string
  panels: (Panel & { custom_entity_types?: string[] })[]
  breakers: Breaker[]
  entities: Entity[]
}

// V2.0 backup format (current - properties introduced)
export interface BackupDataV2 {
  version: '2.0'
  exportDate: string
  properties: Property[]
  panels: Panel[]
  breakers: Breaker[]
  entities: Entity[]
}

export type BackupData = BackupDataV1 | BackupDataV2

export class BackupRepository {
  constructor(private db: Database.Database) {}

  /**
   * Export entire database as JSON (v2.0 format with properties)
   */
  exportDatabase(): BackupDataV2 {
    // Get all properties
    const propertiesStmt = this.db.prepare('SELECT * FROM properties ORDER BY created_at ASC')
    const propertyRows = propertiesStmt.all() as any[]
    const properties: Property[] = propertyRows.map(row => ({
      id: row.id,
      name: row.name,
      custom_entity_types: JSON.parse(row.custom_entity_types || '[]'),
      is_current: Boolean(row.is_current),
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

    // Get all panels
    const panelsStmt = this.db.prepare('SELECT * FROM panels ORDER BY created_at ASC')
    const panelRows = panelsStmt.all() as any[]
    const panels: Panel[] = panelRows.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }))

    // Get all breakers
    const breakersStmt = this.db.prepare('SELECT * FROM breakers ORDER BY panel_id, position ASC')
    const breakerRows = breakersStmt.all() as any[]
    const breakers: Breaker[] = breakerRows.map(row => ({
      ...row,
      is_powered: Boolean(row.is_powered),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }))

    // Get all entities
    const entitiesStmt = this.db.prepare('SELECT * FROM entities ORDER BY panel_id, name ASC')
    const entityRows = entitiesStmt.all() as any[]
    const entities: Entity[] = entityRows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }))

    return {
      version: '2.0',
      exportDate: new Date().toISOString(),
      properties,
      panels,
      breakers,
      entities
    }
  }

  /**
   * Import database from JSON backup
   * Supports both v1.0 (legacy) and v2.0 (current) formats
   * WARNING: This will delete all existing data!
   */
  importDatabase(backup: BackupData): void {
    // Validate backup format
    if (!backup.version || !backup.panels || !backup.breakers || !backup.entities) {
      throw new Error('Invalid backup file format')
    }

    // Use transaction to ensure atomic operation
    const importTransaction = this.db.transaction(() => {
      // Delete all existing data (in reverse order of foreign keys)
      this.db.prepare('DELETE FROM entities').run()
      this.db.prepare('DELETE FROM breakers').run()
      this.db.prepare('DELETE FROM panels').run()
      this.db.prepare('DELETE FROM properties').run()

      if (backup.version === '2.0') {
        // V2.0 format - has properties
        this.importV2(backup)
      } else {
        // V1.0 format - migrate to v2.0 structure
        this.importV1(backup)
      }
    })

    importTransaction()
  }

  private importV2(backup: BackupDataV2): void {
    // Insert properties
    const insertProperty = this.db.prepare(`
      INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const property of backup.properties) {
      insertProperty.run(
        property.id,
        property.name,
        JSON.stringify(property.custom_entity_types),
        property.is_current ? 1 : 0,
        property.created_at,
        property.updated_at
      )
    }

    // Insert panels
    const insertPanel = this.db.prepare(`
      INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const panel of backup.panels) {
      insertPanel.run(
        panel.id,
        panel.property_id,
        panel.name,
        panel.total_positions,
        panel.main_breaker_amperage,
        new Date(panel.created_at).toISOString(),
        new Date(panel.updated_at).toISOString()
      )
    }

    // Insert breakers
    this.insertBreakersAndEntities(backup.breakers, backup.entities)
  }

  private importV1(backup: BackupDataV1): void {
    // Create a default property for v1.0 backups
    const propertyId = 'prop_' + Date.now().toString(36)
    const now = Date.now()

    // Collect all custom entity types from panels
    const allCustomTypes = new Set<string>()
    for (const panel of backup.panels) {
      if (panel.custom_entity_types) {
        panel.custom_entity_types.forEach(type => allCustomTypes.add(type))
      }
    }

    // Insert default property
    this.db.prepare(`
      INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      propertyId,
      'Imported Property',
      JSON.stringify(Array.from(allCustomTypes)),
      1,
      now,
      now
    )

    // Insert panels with property_id
    const insertPanel = this.db.prepare(`
      INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const panel of backup.panels) {
      insertPanel.run(
        panel.id,
        propertyId,
        panel.name,
        panel.total_positions,
        panel.main_breaker_amperage,
        new Date(panel.created_at).toISOString(),
        new Date(panel.updated_at).toISOString()
      )
    }

    // Insert breakers and entities
    this.insertBreakersAndEntities(backup.breakers, backup.entities)
  }

  private insertBreakersAndEntities(breakers: Breaker[], entities: Entity[]): void {
    // Insert breakers
    const insertBreaker = this.db.prepare(`
      INSERT INTO breakers (id, panel_id, position, position_slot, breaker_type, amperage, label, status, is_powered, linked_breaker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const breaker of breakers) {
      insertBreaker.run(
        breaker.id,
        breaker.panel_id,
        breaker.position,
        breaker.position_slot,
        breaker.breaker_type,
        breaker.amperage,
        breaker.label,
        breaker.status,
        breaker.is_powered ? 1 : 0,
        breaker.linked_breaker_id,
        new Date(breaker.created_at).toISOString(),
        new Date(breaker.updated_at).toISOString()
      )
    }

    // Insert entities
    const insertEntity = this.db.prepare(`
      INSERT INTO entities (id, panel_id, breaker_id, entity_type, name, room, location, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const entity of entities) {
      insertEntity.run(
        entity.id,
        entity.panel_id,
        entity.breaker_id,
        entity.entity_type,
        entity.name,
        entity.room,
        entity.location,
        JSON.stringify(entity.metadata),
        new Date(entity.created_at).toISOString(),
        new Date(entity.updated_at).toISOString()
      )
    }
  }
}
