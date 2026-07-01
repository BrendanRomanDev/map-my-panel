# Story 4.5: MCP Task Tools

**Epic:** 4 — Tasks
**Status:** 📋 Ready for dev (next up)
**Refs:** `docs/prd/epic-4-tasks.md` (MCP follow-on), `mcp/README.md`, Stories 4.3/4.4

## Story

As a user, I want the Claude agent (via the map-my-panel MCP) to create, complete,
list, and delete tasks — so I can say "make self-ground tasks for every ungrounded
outlet" or "close out the Office faceplate work" and the agent applies my configured
tag/history rules for me. This is the payoff of building tasks MCP-ready in 4.3/4.4.

## Why now
The repository layer is already MCP-ready: `TaskRepository` is a plain class the
MCP server can reuse exactly like it reuses `TagRepository`/`PanelRepository`
today. Tasks are polymorphic, so a single `create_task` handles outlet, breaker,
panel, or property targets. **No new data-layer work — this is MCP wiring only.**

## Scope (user picked the FULL set)
Add MCP tools mirroring the existing `apply_tags` tool pattern in `mcp/server.ts`:

1. **`list_tasks`** — property-wide, filterable by target_type/status. Returns the
   `TaskWithTarget` shape (label, room, amperage). Also **`list_task_templates`**.
2. **`create_task`** — any target_type + target_id, with optional tag-wiring rules
   (`on_create_tag_id`, `on_complete_remove/add_tag_ids`, `on_complete_log_history`).
   Plus **`create_from_template`** (bulk, N targets).
3. **`complete_task`** — runs `completeWithRules` (flips tags / logs history per the
   task's stored rules). Support the confirm-overrides opts like the UI.
4. **`delete_task`** — with a guard/confirmation note (more destructive).

## Acceptance Criteria
1. Tools registered in `mcp/server.ts` with Zod raw-shape schemas (match the
   `apply_tags` / `add_entities` style; no z.object wrapper).
2. Each tool reuses `TaskRepository` methods — no duplicated SQL.
3. `get_context` (or a companion) exposes tag IDs + target IDs the agent needs to
   wire rules (it already returns properties/panels; extend for tags + entities/
   breakers if needed).
4. MCP auto-backs-up before writes (existing `export_backup` pattern) for
   create/complete/delete.
5. `mcp/README.md` updated with the new tools; **decide command surface** — a new
   `/map-tasks` command vs. leaving `/map-panel` panel-only (recommend: separate
   command; `/map-panel` stays ingest-only).
6. Manual smoke test: agent creates a tag-wired task, completes it, verifies tags
   flipped in the app.

## Dev Notes
- ABI dance: MCP runs under system Node → `npm rebuild better-sqlite3` for MCP/tests,
  `npm run postinstall` to restore the Electron ABI. (`mcp/native/` node-ABI binary.)
- Keep tools unopinionated: the agent supplies judgment (which tag, which rule);
  the tools are pure machinery. See the app=facts / agent=judgment principle.
- Reuse `nativeBinding` loader already in the MCP server.

## Dev Agent Record
_(to be filled by dev)_
