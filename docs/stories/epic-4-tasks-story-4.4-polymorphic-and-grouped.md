# Story 4.4: Polymorphic Tasks + Grouped View (+ nav, amperage)

**Epic:** 4 — Tasks
**Status:** ✅ Done (shipped 2026-06-30)
**Refs:** `docs/prd/epic-4-tasks.md`, builds on Story 4.3

## Story

As a user, I want tasks to attach to *any* level of my system (an outlet, a
breaker, the whole panel, or the property), and I want to browse them the way I
think about my house — by room or by breaker, with the sub-items rolled up —
so a long task list stays scannable and nothing is hidden.

## What shipped

### 1. Polymorphic task targets (was entity-only)
- **Migration 015** — rebuilt `tasks` to `(target_type, target_id)` where
  `target_type ∈ panel|breaker|entity|property`, mirroring tags/history. Data-
  preserving (`entity_id` → `target_id`, backfilled `target_type='entity'`).
  Dropped the entity FK; cleanup moved to the polymorphic delete triggers
  (extended to prune tasks alongside `tag_links`/`event_links`).
- `TaskRepository`: `listForProperty` (property-wide, resolves a `target_label`/
  `target_room`/`target_amperage` per row); `listForTarget`, `openCountForTarget`;
  `createFromTemplate` fans out across mixed target types; `completeWithRules`
  attaches tags + history to the task's OWN target.
- Types: `Task`/`CreateTaskInput` use `target_type`/`target_id`; `TaskWithEntity`
  → `TaskWithTarget`.

### 2. Grouped Tasks view
- **Flat / By Room / By Breaker** (Flat is default). Two-level rollup:
  Room|Breaker → Entity → tasks. Pure `buildTaskGroups` helper (`taskGrouping.ts`).
- Catch-all buckets: **No room** / **No breaker** (entities missing that axis) and
  **General Tasks** (breaker/panel/property targets — higher-level work).
- Collapsed by default; force-expand while searching or in select mode.
- Toolbar redesign: segmented view control (left) + Status/Target filter dropdowns
  (right, matching the entity sidebar) + a search bar. Bulk actions scope to
  VISIBLE (searched) tasks so "Select all shown"/Complete/Delete can't touch
  hidden rows. "Select multiple" moved out of the page header.

### 3. Derived entity amperage
- An entity's amperage IS its breaker's amperage, derived on read (never stored).
  Shared pure helper `entityAmperage.ts`. Surfaced on entity cards, the entity
  edit modal, task rows, and the complete modal (so you know what part to buy).

### 4. Nav refactor
- Replaced three `show*` booleans with a single `activeView` + `MAIN_VIEWS`
  constant. `panel` (home) is a first-class destination with its own home icon —
  no more "deselect the tab to return home."

### 5. Verbiage standardization
- Sidebar `ByRoomView` "Unassigned" → **"No room"**; `ByBreakerView` "Unmapped"
  → **"No breaker"** — matching the task view's catch-alls.

## Tests
`TaskRepository.test.ts` (polymorphic targets, breaker/panel/property tasks,
mixed-type template fan-out, trigger pruning, amperage resolution),
`entityAmperage.test.ts`, `taskGrouping.test.ts`. Full suite 98 passing, typecheck 0.

## Commits
`97a0cd2` (polymorphic + bulk + amperage), `7c57700` (entities plural fix),
`411a73d` (grouped view + toolbar + verbiage), `496bf3b` (nav refactor).

## Not in scope (deferred)
- MCP task tools → **Story 4.5**.
- Per-group "select all" in grouped view (bulk currently selects across all groups).
