# Story 2.4: Event-Type Manager (Settings)

**Epic:** 2 — History Events
**Status:** Ready for Review

## Story

Manage history event types from Settings — list, rename, create, delete — mirroring the TagManager. Closes out the History epic.

## Acceptance Criteria

1. Settings has a "Manage Event Types" section listing property-scoped + global types (global marked).
2. Rename and create event types inline.
3. Delete with a confirmation showing usage count ("N events use this type; they'll be kept but shown without a type").
4. Deleting a type leaves its events intact (event_type_id → NULL, already enforced in the schema).
5. Defaults are editable/deletable (consistent with tags).
6. Typecheck baseline (0 new); build succeeds; tests pass.

## Dev Agent Record

### File List
**New:**
- `src/renderer/components/settings/EventTypeManager.tsx`

**Modified:**
- `src/main/db/repositories/HistoryRepository.ts` (countEventsForType)
- `src/main/ipc/historyHandlers.ts`, `src/preload/index.ts` (countEventsForType IPC)
- `src/renderer/components/settings/SettingsView.tsx` (mount EventTypeManager)
- `tests/integration/HistoryRepository.test.ts` (countEventsForType test)

### Completion Notes
- 44 tests pass (1 new). Typecheck baseline (9 pre-existing, 0 new). Build succeeds.
- Added countEventsForType for the delete-confirmation usage count.
- Repo CRUD (list/create/update/delete) already existed from 2.1; this is the Settings UI + count helper.
- Deleting a type is non-destructive to events (ON DELETE SET NULL).

### Change Log
- 2026-06-23: Event-type management UI in Settings. Completes the Tags & History feature (Epics 1 + 2).
