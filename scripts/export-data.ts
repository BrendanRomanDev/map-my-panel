/**
 * One-off export script for map-my-panel.
 *
 * Reads the live SQLite DB directly (no Electron needed) and produces two files in ./tmp/:
 *
 *   1. personal-backup.json  — your full DB, v2.0 backup format, directly importable
 *                              via Settings -> Backup -> Import on any install.
 *   2. seed-template.json    — the densest single-panel slice of your data, sanitized,
 *                              suitable for bundling with the app as a first-run template.
 *                              Names are kept; IDs and timestamps are regenerated to look
 *                              like a brand-new install.
 *
 * Run with: npm run export:data
 */

// Uses Node 22's built-in node:sqlite (experimental but stable enough for a
// read-only one-shot script) so we don't need to rebuild better-sqlite3 against
// the system Node ABI just to run this. The app itself still uses better-sqlite3.
import { DatabaseSync } from 'node:sqlite'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const OUT_DIR = join(REPO_ROOT, 'tmp')

const DB_PATH = join(
  homedir(),
  'Library',
  'Application Support',
  'map-my-panel',
  'map-my-panel.db'
)

interface PropertyRow {
  id: string
  name: string
  custom_entity_types: string
  is_current: number
  created_at: string
  updated_at: string
}

interface PanelRow {
  id: string
  property_id: string
  name: string
  total_positions: number
  main_breaker_amperage: number | null
  created_at: string
  updated_at: string
}

interface BreakerRow {
  id: string
  panel_id: string
  position: number
  position_slot: string | null
  breaker_type: string
  amperage: number | null
  label: string | null
  status: string
  is_powered: number
  linked_breaker_id: string | null
  created_at: string
  updated_at: string
}

interface EntityRow {
  id: string
  panel_id: string
  breaker_ids: string
  entity_type: string
  name: string
  room: string | null
  location: string | null
  metadata: string
  created_at: string
  updated_at: string
}

function exportPersonalBackup(db: DatabaseSync) {
  const properties = (db.prepare('SELECT * FROM properties ORDER BY created_at ASC').all() as PropertyRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      custom_entity_types: JSON.parse(row.custom_entity_types || '[]'),
      is_current: Boolean(row.is_current),
      created_at: row.created_at,
      updated_at: row.updated_at
    })
  )

  const panels = (db.prepare('SELECT * FROM panels ORDER BY created_at ASC').all() as PanelRow[]).map((row) => ({
    ...row,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }))

  const breakers = (
    db.prepare('SELECT * FROM breakers ORDER BY panel_id, position ASC').all() as BreakerRow[]
  ).map((row) => ({
    ...row,
    is_powered: Boolean(row.is_powered),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }))

  const entities = (
    db.prepare('SELECT * FROM entities ORDER BY panel_id, name ASC').all() as EntityRow[]
  ).map((row) => ({
    ...row,
    breaker_ids: JSON.parse(row.breaker_ids || '[]'),
    metadata: JSON.parse(row.metadata || '{}'),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }))

  return {
    version: '2.0' as const,
    exportDate: new Date().toISOString(),
    properties,
    panels,
    breakers,
    entities
  }
}

function pickDensestPanel(db: DatabaseSync): string {
  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        (SELECT COUNT(*) FROM breakers WHERE panel_id = p.id) AS breakers,
        (SELECT COUNT(*) FROM entities WHERE panel_id = p.id) AS entities
      FROM panels p
      ORDER BY entities DESC, breakers DESC
      LIMIT 1
    `
    )
    .all() as { id: string; breakers: number; entities: number }[]

  if (rows.length === 0) {
    throw new Error('No panels found in the live DB — nothing to export as a seed template.')
  }
  return rows[0].id
}

function exportSeedTemplate(db: DatabaseSync) {
  const sourcePanelId = pickDensestPanel(db)

  const panelRow = db.prepare('SELECT * FROM panels WHERE id = ?').get(sourcePanelId) as PanelRow
  const breakerRows = db
    .prepare('SELECT * FROM breakers WHERE panel_id = ? ORDER BY position ASC')
    .all(sourcePanelId) as BreakerRow[]
  const entityRows = db
    .prepare('SELECT * FROM entities WHERE panel_id = ? ORDER BY name ASC')
    .all(sourcePanelId) as EntityRow[]

  const propertyRow = db
    .prepare('SELECT * FROM properties WHERE id = ?')
    .get(panelRow.property_id) as PropertyRow | undefined

  // Regenerate IDs so the import doesn't collide with anything pre-existing.
  const newPropertyId = `prop_${randomUUID()}`
  const newPanelId = `panel_${randomUUID()}`
  const breakerIdMap = new Map<string, string>()
  for (const b of breakerRows) {
    breakerIdMap.set(b.id, `breaker_${randomUUID()}`)
  }

  const nowIso = new Date().toISOString()

  const property = {
    id: newPropertyId,
    name: 'Sample Property',
    custom_entity_types: propertyRow ? JSON.parse(propertyRow.custom_entity_types || '[]') : [],
    is_current: true,
    created_at: nowIso,
    updated_at: nowIso
  }

  const panel = {
    id: newPanelId,
    property_id: newPropertyId,
    name: 'Sample Panel',
    total_positions: panelRow.total_positions,
    main_breaker_amperage: panelRow.main_breaker_amperage,
    created_at: new Date(nowIso),
    updated_at: new Date(nowIso)
  }

  const breakers = breakerRows.map((b) => ({
    id: breakerIdMap.get(b.id)!,
    panel_id: newPanelId,
    position: b.position,
    position_slot: b.position_slot,
    breaker_type: b.breaker_type,
    amperage: b.amperage,
    label: b.label,
    status: b.status,
    is_powered: Boolean(b.is_powered),
    linked_breaker_id: b.linked_breaker_id ? breakerIdMap.get(b.linked_breaker_id) ?? null : null,
    created_at: new Date(nowIso),
    updated_at: new Date(nowIso)
  }))

  const entities = entityRows.map((e) => {
    const oldBreakerIds: string[] = JSON.parse(e.breaker_ids || '[]')
    const newBreakerIds = oldBreakerIds
      .map((id) => breakerIdMap.get(id))
      .filter((id): id is string => Boolean(id))

    return {
      id: `entity_${randomUUID()}`,
      panel_id: newPanelId,
      breaker_ids: newBreakerIds,
      entity_type: e.entity_type,
      name: e.name,
      room: e.room,
      location: e.location,
      metadata: JSON.parse(e.metadata || '{}'),
      created_at: new Date(nowIso),
      updated_at: new Date(nowIso)
    }
  })

  return {
    version: '2.0' as const,
    exportDate: nowIso,
    properties: [property],
    panels: [panel],
    breakers,
    entities
  }
}

function main() {
  console.log(`Reading DB: ${DB_PATH}`)
  const db = new DatabaseSync(DB_PATH, { readOnly: true })

  mkdirSync(OUT_DIR, { recursive: true })

  const personal = exportPersonalBackup(db)
  const personalPath = join(OUT_DIR, 'personal-backup.json')
  writeFileSync(personalPath, JSON.stringify(personal, null, 2))
  console.log(
    `\nPersonal backup written: ${personalPath}` +
      `\n  properties: ${personal.properties.length}` +
      `\n  panels:     ${personal.panels.length}` +
      `\n  breakers:   ${personal.breakers.length}` +
      `\n  entities:   ${personal.entities.length}`
  )

  const seed = exportSeedTemplate(db)
  const seedPath = join(OUT_DIR, 'seed-template.json')
  writeFileSync(seedPath, JSON.stringify(seed, null, 2))
  console.log(
    `\nSeed template written:   ${seedPath}` +
      `\n  panel:    ${seed.panels[0].name} (${seed.panels[0].total_positions} positions)` +
      `\n  breakers: ${seed.breakers.length}` +
      `\n  entities: ${seed.entities.length}`
  )

  db.close()
  console.log('\nDone.')
}

main()
