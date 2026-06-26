#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { homedir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { openDatabase, resolveDbPath } from './db'
import {
  PanelImportPlanSchema,
  PanelBreakerShape,
  PanelLinkShape,
  AddEntityShape,
  AddEntitySchema,
  dryRunImport,
  applyImport,
  addEntities
} from './panelImport'
import { PropertyRepository, PanelRepository, BreakerRepository } from '../src/main/db/repositories'

const server = new McpServer({ name: 'map-my-panel', version: '0.2.0' })

function text(obj: unknown) {
  return { content: [{ type: 'text' as const, text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] }
}

// Zod raw shape for a full import plan (registerTool wants a raw shape, not a z.object)
const importPlanShape = {
  panelId: z.string().describe('Target panel id (from get_context).'),
  breakers: z.array(z.object(PanelBreakerShape)).describe('Breakers to create/update with their entities.'),
  links: z.array(z.object(PanelLinkShape)).default([]).describe('Double-pole pairs to link, e.g. {aPosition:"17b", bPosition:"19a"}.')
}

// 1) get_context — what properties/panels exist
server.registerTool(
  'get_context',
  {
    title: 'Get Map My Panel context',
    description:
      'Returns the current properties and panels (ids + names) so you know what exists and which panel to import into. Call this first.'
  },
  async () => {
    const db = openDatabase()
    try {
      const props = new PropertyRepository(db).findAll()
      const panelRepo = new PanelRepository(db)
      const result = props.map(p => ({
        propertyId: p.id,
        propertyName: p.name,
        isCurrent: p.is_current,
        panels: panelRepo.findByProperty(p.id).map(panel => ({ panelId: panel.id, name: panel.name, totalPositions: panel.total_positions }))
      }))
      return text({ dbPath: resolveDbPath(), properties: result })
    } finally {
      db.close()
    }
  }
)

// 2) preview_panel_import — dry run, no writes
server.registerTool(
  'preview_panel_import',
  {
    title: 'Preview panel import (dry run)',
    description:
      'Shows exactly what a panel import would create/update WITHOUT writing anything. Always call this and show the result to the user before apply_panel_import.',
    inputSchema: importPlanShape
  },
  async ({ panelId, breakers, links }) => {
    const db = openDatabase()
    try {
      const plan = PanelImportPlanSchema.parse({ breakers, links })
      return text(dryRunImport(db, panelId, plan))
    } finally {
      db.close()
    }
  }
)

// 3) apply_panel_import — backup + write
server.registerTool(
  'apply_panel_import',
  {
    title: 'Apply panel import',
    description:
      'Auto-backs-up the database, then writes the panel import via the app repository layer (all rules enforced) in a transaction. Only call after the user has approved a preview.',
    inputSchema: importPlanShape
  },
  async ({ panelId, breakers, links }) => {
    const db = openDatabase()
    try {
      const plan = PanelImportPlanSchema.parse({ breakers, links })
      const backupDir = process.env.MAP_MY_PANEL_BACKUP_DIR || join(homedir(), 'Documents', 'map-my-panel-backups')
      mkdirSync(backupDir, { recursive: true })
      const result = applyImport(db, panelId, plan, backupDir)
      return text(result)
    } finally {
      db.close()
    }
  }
)

// 4) export_backup — on-demand v3 backup
server.registerTool(
  'export_backup',
  {
    title: 'Export a backup',
    description: 'Writes a full v3.0 JSON backup of the database to a file and returns the path.',
    inputSchema: { dir: z.string().optional().describe('Directory to write the backup into. Defaults to ~/Documents/map-my-panel-backups.') }
  },
  async ({ dir }) => {
    const db = openDatabase()
    try {
      const { BackupRepository } = await import('../src/main/db/repositories')
      const backup = new BackupRepository(db).exportDatabase()
      const outDir = dir || join(homedir(), 'Documents', 'map-my-panel-backups')
      mkdirSync(outDir, { recursive: true })
      const path = join(outDir, `map-my-panel-backup-${backup.exportDate.replace(/[:.]/g, '-')}.json`)
      writeFileSync(path, JSON.stringify(backup, null, 2), 'utf-8')
      return text({ backupPath: path, version: backup.version })
    } finally {
      db.close()
    }
  }
)

// 5) add_entities — create entities (optionally unmapped / breaker-less)
server.registerTool(
  'add_entities',
  {
    title: 'Add entities',
    description:
      'Create one or more entities on a panel. Omit breakerPosition to leave an entity UNMAPPED (it shows a sidebar warning until traced). Use breakerPosition ("12", "17b") to assign to an existing breaker. Auto-backs-up before writing.',
    inputSchema: {
      panelId: z.string().describe('Target panel id (from get_context).'),
      entities: z.array(z.object(AddEntityShape)).describe('Entities to create. Each may set room/location and an optional breakerPosition.')
    }
  },
  async ({ panelId, entities }) => {
    const db = openDatabase()
    try {
      const parsed = z.array(AddEntitySchema).parse(entities)
      const backupDir = process.env.MAP_MY_PANEL_BACKUP_DIR || join(homedir(), 'Documents', 'map-my-panel-backups')
      mkdirSync(backupDir, { recursive: true })
      return text(addEntities(db, panelId, parsed, backupDir))
    } finally {
      db.close()
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr is safe for logging; stdout is the MCP channel
  console.error(`map-my-panel MCP server running. DB: ${resolveDbPath()}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
