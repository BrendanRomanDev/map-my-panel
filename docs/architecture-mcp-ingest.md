# Map My Panel — MCP Ingest Server (Design)

**Author:** Winston (Architect) with Brendan
**Date:** 2026-06-23
**Status:** Draft — design only, no code yet
**Related:** [Tags & History Architecture](./architecture-tags-and-history.md)

Lets Brendan use Claude Code as a data-entry interface to Map My Panel: hand it a
panel directory (text/Excel/CSV), a photo (OCR'd by Claude), or a voice-rant
transcript, get interviewed about the ambiguities, review a dry-run, and have it
written into the app's database — so the next app launch reflects everything.

---

## Goals

- Turn messy real-world panel input into structured app data with minimal manual typing.
- **Enforce all business rules** — writes go through the existing repository layer, never raw SQL.
- **Safe** — parse → interview → dry-run → auto-backup → write. Nothing destructive without review.
- Work whether or not the Electron app is running.

## Anti-Goals

- Not a live sync while the app is open (changes appear on next read/launch — acceptable).
- Not a general SQL console — the surface is intent-level (import a panel, add entities, etc.).
- Not an OCR/transcription engine itself — Claude Code does OCR/transcription; the MCP receives already-structured intent.

---

## Core Architectural Decision: MCP calls the repository layer

The app's business rules live in `src/main/db/repositories/*.ts` (not in a running
server). Examples that raw SQL would bypass:

- Double-pole linking sets `breaker_type` + `linked_breaker_id` on **both** sides, validates against already-paired breakers, syncs amperage/status.
- Entity assignment maintains the `breaker_ids` JSON array + double-pole partner sync.
- Property creation seeds default tags + event types.
- History events auto-attach to the property when target-less; enforce the ≥1-link rule.
- Tag scoping (per-property vs global) + name uniqueness.

So the MCP server **imports and instantiates the same repository classes**, opening
the same SQLite DB (`~/Library/Application Support/map-my-panel/map-my-panel.db`).
All rules apply; no app process required.

```
Claude Code (OCR / transcribe / parse / interview)
        │  structured intent
        ▼
MCP server (Node)  ──►  Repository classes  ──►  SQLite (+ triggers)
                         (BreakerRepository,        same file the
                          EntityRepository, …)      Electron app reads
```

### Caveat: some rules currently live in the renderer

The double-pole link **planner** is in `src/renderer/lib/breakerLinking.ts` (UI
layer). For the MCP to enforce it, that pure logic should move to a shared
location both the renderer and the MCP/main can import (e.g. `src/shared/` or
`src/main/db/`). Small refactor, tracked as a prerequisite task. The planner is
already pure + unit-tested, so the move is low-risk.

---

## The Pipeline (every input type funnels through this)

1. **Ingest** — Claude Code converts the raw input into a canonical intermediate:
   - Excel/CSV/text → parsed rows
   - Photo → Claude OCR → text → parsed rows
   - Voice transcript → Claude parses intent → parsed rows
2. **Parse** → a `PanelImportPlan` (see schema below): breakers with type/poles, the entities on each, inferred rooms, detected double-pole pairs, blanks/spares.
3. **Interview** — Claude asks Brendan about ambiguities (abbreviations, implied links, room inference). Answers refine the plan.
4. **Dry-run** — the MCP returns a human-readable diff of exactly what will be created/changed. No writes yet.
5. **Confirm** — Brendan approves.
6. **Backup** — MCP auto-exports a v3.0 backup (reusing `BackupRepository.exportDatabase`) to a timestamped file.
7. **Write** — MCP calls repository methods in dependency order (breakers → entities → links → tags), in a transaction.

---

## Parsing model (from Brendan's real panel)

The example panel exercises every hard case the parser must handle:

| Case | Example | Handling |
|------|---------|----------|
| Multiple devices per breaker | `1` = "Garage Outlets, Garage Lights, Garage Door, Outside Back Outlet" | Split on commas → 4 entities on breaker 1 |
| Tandem (slots) | `15a` / `15b`, `17a` / `17b`, `19a` / `19b` | position + position_slot |
| Double-pole pair | `2`+`4` "Range", `6`+`8` "Air Cond", `17b`+`19a` "Generator" | Same label on adjacent breakers → propose linking |
| Blanks / spares | `9`, `13`, `20` "blank", `10` "Unk" | status='spare', no entities |
| Abbreviations | "M bath", "mbr", "Sunrm", "Din Ovhd", "F&B" | **Interview** to expand |
| Parentheticals | "(Kitch cabinet Switch)", "(and switch)" | Sub-note → entity location/notes |
| Implied room+type | "Kitchen outlets" | room=Kitchen, entity_type=outlet (confirm) |

Double-pole detection is a **proposal**, never automatic — Claude asks
("Rows 2 & 4 are both 'Range' — link as one 240V double-pole?") because two
breakers sharing a label isn't always a physical pair.

---

## MCP Tool Surface (v1 — bulk panel import first)

Tools the MCP exposes to Claude Code:

- **`get_context`** — returns current properties/panels (ids, names) so Claude knows what exists and where to import.
- **`preview_panel_import`** — input: a `PanelImportPlan` + target panelId (or "new panel" params). Output: a dry-run diff (breakers to create/update, entities, proposed links, tags). **No writes.**
- **`apply_panel_import`** — input: an approved `PanelImportPlan` + target. Auto-backs-up, then writes via repositories in a transaction. Returns a summary.
- **`export_backup`** — on-demand v3.0 backup to a file (also used internally before writes).

Later (v2): granular tools (`add_entities`, `set_breaker`, `attach_tag`,
`log_history_event`) so voice rants like "log that I replaced the garage outlet
today" compose without a full panel import.

### PanelImportPlan schema (sketch)

```ts
interface PanelImportPlan {
  breakers: Array<{
    position: number
    position_slot?: 'a' | 'b' | null
    breaker_type?: 'single-pole' | 'double-pole'
    amperage?: number          // interview/default if unknown
    label?: string
    status: 'active' | 'spare'
    entities: Array<{ name: string; entity_type: string; room?: string; location?: string }>
  }>
  links: Array<{ aPosition: string; bPosition: string; reason: string }>  // proposed double-pole pairs
  tags?: Array<{ targetPosition: string; tagName: string }>               // e.g. "no ground wire"
}
```

---

## Safety

- **Dry-run is mandatory** before any write tool runs.
- **Auto-backup** (v3.0) immediately before every write, to a timestamped file Brendan can restore via Settings.
- **Transactional writes** — a failed import rolls back fully.
- **Never resets the DB** (per project rule — real data). Imports are additive/updating only; the dry-run flags any breaker position that already exists so Brendan decides update-vs-skip.

---

## Distribution / How Brendan runs it

- Standalone Node MCP server in the repo (e.g. `mcp/` dir), added to Claude Code's MCP config pointing at the app's DB path.
- Built with the MCP TypeScript SDK; reuses the repo's repository classes + better-sqlite3 (already a dependency).
- DB path configurable (defaults to the macOS userData path) so it works on either of Brendan's machines.

---

## Open Questions / Prerequisites

1. **Move `breakerLinking.ts` planner to a shared layer** so the MCP enforces link rules. (Prereq task.)
2. **Amperage when unknown** — the directory rarely lists amps. Default (15A single / 20A for kitchen/bath / 30A+ for Range/AC/Dryer) with interview confirmation, or always ask? (Lean: smart default + confirm.)
3. **Update vs. create on existing positions** — if a panel already has breaker 12, does an import update its label/entities or skip? (Lean: dry-run shows the conflict, Brendan chooses per-import.)
4. **MCP SDK packaging** — confirm the better-sqlite3 native binary works under the MCP server's Node (same ABI gotcha we hit in tests).
