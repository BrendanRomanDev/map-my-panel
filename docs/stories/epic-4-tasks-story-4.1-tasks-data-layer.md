# Story 4.1: Tasks Data Layer

**Epic:** 4 — Tasks
**Status:** Approved (ready for dev)
**Refs:** `docs/prd/epic-4-tasks.md`

## Story

As a user, I want tasks persisted in the data layer so the UI can list, add,
complete, and generate entity-linked to-dos.

## Acceptance Criteria

1. Migration adds a `tasks` table: `id`, `entity_id` (FK → entities, ON DELETE
   CASCADE), `title`, `notes`, `task_type` (nullable), `status` ('open'|'done'),
   `created_at`, `updated_at`, `completed_at` (nullable). Additive-only migration.
2. `TaskRepository`: `create`, `update`, `complete(id)` (sets status+completed_at),
   `reopen(id)`, `delete`, `listForEntity(entityId)`, `listForPanel(panelId)`
   (join entities), `listOpenForPanel(panelId)`.
3. `task_types` seeded defaults (Self-Ground, Map Circuit, Replace Outlet, Inspect,
   Other), managed per-property + global like event_types. (Or reuse a simple
   string list — decide in dev; lean: a managed table for consistency.)
4. IPC `tasks:*` + preload `electronAPI.tasks.*` + `useTasks*` hooks + query keys.
5. Unit tests (in-memory DB): CRUD, complete/reopen, listForPanel join, cascade on
   entity delete.
6. Typecheck baseline (0 new); build succeeds.

## Dev Notes

- Mirror TagRepository/HistoryRepository conventions. House style: single quotes,
  no semicolons. Additive migration only (real data — never reset).
- Entity-only target in v1 (no polymorphic links needed yet).

## Dev Agent Record
_(to be filled by dev)_
