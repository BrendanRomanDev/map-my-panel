# Story 2.1: History Data Layer (Repository, IPC, Hooks, Tests)

**Epic:** 2 — History Events
**Status:** Done — Released v0.2.0
**Architecture ref:** `docs/architecture-tags-and-history.md`, `docs/front-end-spec-tags-and-history.md`

## Story

As a user, I want history events to be persisted and queryable through the data layer, so later UI work can show timelines and add/edit events on panels, breakers, entities, and the property.

Backend slice only — no UI in this story. Schema (migration 010) already exists.

## Acceptance Criteria

1. `HistoryRepository` supports:
   - `createEvent(input)` — one event + N links in a transaction. If `targets` omitted/empty, auto-attach to the event's `property` (standalone note).
   - `updateEvent(id, input)` — edit event_type, title, notes, occurred_on, tag_id.
   - `deleteEvent(id)` — cascades event_links.
   - `addTargets(eventId, targets[])` / `removeTarget(eventId, target)` — mutable links (misclick fix). Removing the last link is blocked (event must keep ≥1 link).
   - `listForTarget(targetType, targetId)` — events on a target, with details (event type name, tag, all targets), newest `occurred_on` first.
   - `listForProperty(propertyId)` — all events for the property (global view), newest first.
   - Event types: `listEventTypes(propertyId)` (scoped + global), `createEventType`, `updateEventType`, `deleteEventType`.
2. `listForTarget` / `listForProperty` return `HistoryEventWithDetails` (event_type_name, tag, targets[]).
3. IPC handlers expose all methods under `history:*`, registered in `src/main/ipc/index.ts`.
4. Preload exposes `electronAPI.history.*`.
5. React Query hooks: `useHistoryForTarget`, `useHistoryForProperty`, `useEventTypes`.
6. Entity/Breaker delete already cleans up `event_links` (done in Story 1.1) — verify still holds.
7. Unit tests cover the repository (in-memory DB) and pass.
8. Typecheck baseline (0 new); build succeeds.

## Dev Notes

- House style: single quotes, no semicolons. No Prettier.
- Mirror TagRepository conventions (randomUUID, toISOString, transactions, row mappers).
- `occurred_on` is TEXT YYYY-MM-DD; `logged_at` is set by DB default, immutable.
- Default event types already seeded by migration 010 + PropertyRepository.
- Test rebuild gotcha: `npm rebuild better-sqlite3` → test → `npm run postinstall`.

## Dev Agent Record

### File List
**New:**
- `src/main/db/repositories/HistoryRepository.ts`
- `src/main/ipc/historyHandlers.ts`
- `src/renderer/hooks/useHistory.ts`
- `tests/integration/HistoryRepository.test.ts`

**Modified:**
- `src/shared/types/index.ts` (UpdateEventTypeInput)
- `src/main/db/repositories/index.ts` (export HistoryRepository)
- `src/main/ipc/index.ts` (register history handlers)
- `src/preload/index.ts` (history namespace)
- `src/renderer/lib/queryKeys.ts` (history keys)

### Completion Notes
- 36 unit tests pass (12 new HistoryRepository). Typecheck baseline (9, 0 new). Build succeeds.
- HistoryRepository is a standalone service class (spans events + links + types), not a BaseRepository subclass.
- createEvent wraps event + all links in one transaction; auto-attaches to property when no targets.
- removeTarget blocks removing the last link (event keeps ≥1); deleteEvent cascades links.
- deleteEventType verified to SET NULL on referencing events (history survives).
- Entity/Breaker delete already clean up event_links (from Story 1.1).
- NO UI yet — Story 2.2 (breaker-detail timeline + Add/Edit) is next.

### Change Log
- 2026-06-23: Implemented History data layer (repo, IPC, preload, hooks, tests).
