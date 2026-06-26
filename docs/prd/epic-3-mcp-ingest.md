# Epic 3 — MCP Ingest Server (Claude Code as a data-entry interface)

**Status:** Delivered (v1) — retroactively documented
**Type:** Brownfield enhancement (developer tooling, not part of the shipped DMG)
**Design doc:** `docs/architecture-mcp-ingest.md`
**Delivered:** 2026-06-23 → 2026-06-26

## Epic Goal

Let Brendan populate Map My Panel by *talking to Claude Code* instead of hand-
entering data through the UI. Hand it a breaker directory (text/CSV), a photo
(OCR'd by Claude), or a voice-rant transcript; Claude parses, normalizes the
messy shorthand into clean names, interviews on ambiguities, previews, and writes
into the same SQLite DB the app reads — through the app's repository layer, so all
business rules apply.

## Why (Background)

Brendan's panel directory is messy, abbreviated, partly out of date, and ~50+
entities deep. Manual entry through the UI is hours of work. The MCP collapses
that into a reviewed conversation, and is reusable for ongoing circuit tracing.

## Scope & Non-Goals

- **In scope:** a Node MCP server reusing the repository layer; bulk panel import
  with dry-run + auto-backup; standalone/unmapped entity creation; tag application.
- **Out of scope (shipped app):** the MCP is dev-only tooling, runs from source,
  NOT bundled in the DMG. No version bump triggered.
- **Deferred:** history-event logging via MCP (see Epic 2 / future).

## Stories (delivered)

| Story | Title | Status | Commits |
|-------|-------|--------|---------|
| 3.1 | MCP design doc | Done | 6174865 |
| 3.2 | Shared `breakerLinking` planner (prereq) | Done | b139027 |
| 3.3 | MCP server v1: bulk panel import (get_context, preview, apply, export_backup) | Done | 87b3d16 |
| 3.4 | `/map-panel` command (workflow + naming philosophy) | Done | 3289bb5 |
| 3.5 | Node-ABI binary fix (nativeBinding) | Done | 5fbbc10 |
| 3.6 | README + CHANGELOG documentation | Done | 9e81f4e |
| 3.7 | `add_entities` tool (unmapped/trace-later entities) | Done | 2ff7457 |
| 3.8 | `apply_tags` tool | Done | f3701b9 |

## Bug fixes during real-data import (all tested)

Surfaced by importing Brendan's real 110 Amherston panel:

| Fix | Commit |
|-----|--------|
| `require` not defined under ESM/tsx (backup writes) | b3afa40 |
| Tandem container breaker creation | d6d12f0 |
| Don't write specs to an existing container breaker | fec73b8 |
| Double-pole entities attached to both halves | 88829b5 |

## Acceptance (met)

- 6 MCP tools live: `get_context`, `preview_panel_import`, `apply_panel_import`,
  `add_entities`, `apply_tags`, `export_backup`.
- All writes go through repositories (rules enforced), auto-backup, transactional.
- `/map-panel` command encodes the parse → normalize → interview → preview →
  apply workflow with the naming philosophy.
- 59 unit tests passing; typecheck baseline clean.
- Real-world validation: 110 Amherston imported (200A main, 23 breakers, 63
  entities, 3 double-pole pairs, 20+ tags).

## Outstanding / follow-ups

- `log_history_event` MCP tool (property/panel history events) — NOT built.
- Granular per-entity edit tools (v2).
- The better-sqlite3 ABI requires `npm run mcp:setup` once per Node version.
