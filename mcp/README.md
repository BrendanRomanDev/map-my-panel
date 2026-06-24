# Map My Panel — MCP Ingest Server

Lets Claude Code act as a data-entry interface to Map My Panel. Give Claude a
panel directory (text, CSV, a photo it OCRs, or a voice-rant transcript); it
parses, interviews you about ambiguities, previews the changes, and writes them
into the app's database via the app's own repository layer — so all business
rules apply and the next app launch reflects everything.

Design: [`docs/architecture-mcp-ingest.md`](../docs/architecture-mcp-ingest.md).

## Prerequisites

- The desktop app must have been **launched at least once** (creates the DB).
- Node + the repo's dependencies installed (`npm install`).

## Tools

| Tool | What it does |
|------|--------------|
| `get_context` | Lists properties + panels (ids/names) so Claude knows where to import. Call first. |
| `preview_panel_import` | Dry-run: shows exactly what would be created/updated. **No writes.** |
| `apply_panel_import` | Auto-backs-up, then writes the import in a transaction via the repositories. |
| `export_backup` | Writes a full v3.0 backup JSON and returns the path. |

The intended flow: `get_context` → parse your input into a plan → `preview_panel_import` → you approve → `apply_panel_import`.

## Register it with Claude Code

Add to your Claude Code MCP config (e.g. `~/.claude.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "map-my-panel": {
      "command": "npx",
      "args": ["tsx", "/Users/broman/Documents/Programming/map-my-panel/mcp/server.ts"]
    }
  }
}
```

Or from the repo root:

```bash
claude mcp add map-my-panel -- npx tsx ./mcp/server.ts
```

### Environment overrides

- `MAP_MY_PANEL_DB` — path to the SQLite DB (defaults to the app's per-OS userData path).
- `MAP_MY_PANEL_BACKUP_DIR` — where auto/manual backups are written (defaults to `~/Documents/map-my-panel-backups`).

## Safety

- `preview_panel_import` never writes — always preview before applying.
- `apply_panel_import` auto-exports a v3.0 backup before writing, and writes in a transaction (rolls back on error).
- Writes go through the repository layer, so double-pole linking, entity arrays, seeding, and validation all apply. It never resets the DB.

## Note: native module

`better-sqlite3` is compiled for Electron's ABI by the app's `postinstall`. The
MCP runs under system Node, which has a different ABI. If the server errors with
a `NODE_MODULE_VERSION` mismatch, run `npm rebuild better-sqlite3` before
starting it (and `npm run postinstall` again before running the desktop app). A
permanent fix (a separate node-ABI copy of the binary) is a future improvement.
