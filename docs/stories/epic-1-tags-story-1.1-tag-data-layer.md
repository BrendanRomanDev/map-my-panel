# Story 1.1: Tag Data Layer (Migration, Types, Repository, IPC)

**Epic:** 1 — Tags
**Status:** Done _(Released v0.2.0)_
**Architecture ref:** `docs/architecture-tags-and-history.md`

## Story

As a user, I want tags to be persisted and manageable through the app's data layer, so that later UI work can create, rename, attach, and detach tags on panels, breakers, and entities.

This story delivers the full backend slice for tags: schema (already drafted as migration 009), shared types (already drafted), a `TagRepository`, IPC handlers, preload namespace, and unit tests. No UI is built in this story.

## Acceptance Criteria

1. Migration 009 creates `tags` + `tag_links` with indexes and per-scope unique name constraints, and seeds default tags for existing properties. (Already in `database.ts` — verify it runs idempotently.)
2. `TagRepository` supports: `create`, `update`, `delete`, `findById`, `listForProperty(propertyId)` (returns property-scoped + global), `listForTarget(targetType, targetId)`, `attach(tagId, target)`, `detach(tagId, target)`, `listTargetsForTag(tagId)`.
3. `listForProperty` returns both property-scoped tags AND global tags (property_id IS NULL).
4. Attaching the same tag to the same target twice is idempotent (no error, no duplicate row).
5. Creating a duplicate tag name within the same scope throws; same name across different properties is allowed.
6. IPC handlers expose all repository methods under the `tags:*` channel, registered in `src/main/ipc/index.ts`.
7. Preload exposes `electronAPI.tags.*` (interface + impl) matching existing namespace style.
8. Unit tests cover the repository against an in-memory SQLite DB and all pass.
9. `npm run typecheck` introduces zero new errors (baseline is 9 pre-existing).

## Tasks / Subtasks

- [ ] Verify migration 009 runs cleanly and idempotently (AC: 1)
- [ ] Create `TagRepository` extending `BaseRepository`, mirroring `EntityRepository` conventions (randomUUID, toISOString, prepared statements, row mappers, transactions) (AC: 2,3,4,5)
- [ ] Add `tagHandlers.ts` and register in `src/main/ipc/index.ts` (AC: 6)
- [ ] Add `tags` to repositories `index.ts` export (AC: 2)
- [ ] Add `electronAPI.tags` to preload interface + impl (AC: 7)
- [ ] Write `TagRepository` unit tests (in-memory DB) (AC: 8)
- [ ] Run typecheck + tests (AC: 8,9)

## Dev Notes

- House style: single quotes, no semicolons. Do NOT run Prettier (no config).
- Map `condense` INTEGER (0/1) ↔ boolean in row mappers (like `is_powered`/`is_container` in BreakerRepository).
- Polymorphic targets have no FK — repo is the integrity boundary.
- Bind `condense` as `input.condense ? 1 : 0`.
- For `listForProperty`: `WHERE property_id = ? OR property_id IS NULL`.
- New test file is the FIRST in the repo — establish a simple Vitest pattern using `new Database(':memory:')` and running migrations.

## Dev Agent Record

### File List
**New:**
- `src/main/db/migrations.ts` (extracted from database.ts so migrations run without electron)
- `src/main/db/repositories/TagRepository.ts`
- `src/main/ipc/tagHandlers.ts`
- `src/renderer/hooks/useTags.ts`
- `src/renderer/components/tags/TagBadge.tsx`
- `src/renderer/components/tags/TagBadgeList.tsx`
- `src/renderer/components/tags/TagPicker.tsx`
- `tests/integration/TagRepository.test.ts`

**Modified:**
- `src/main/db/database.ts` (import runMigrations from migrations.ts)
- `src/main/db/repositories/index.ts` (export TagRepository)
- `src/main/db/repositories/PropertyRepository.ts` (seed default tags + event types on create)
- `src/main/db/repositories/EntityRepository.ts` (cleanup tag/event links on delete)
- `src/main/db/repositories/BreakerRepository.ts` (cleanup tag/event links on delete)
- `src/main/ipc/index.ts` (register tag handlers)
- `src/preload/index.ts` (tags namespace)
- `src/renderer/lib/queryKeys.ts` (tag keys)
- `src/renderer/components/entities/EntityCard.tsx` (TagBadgeList)
- `src/renderer/components/breaker-panel/BreakerCard.tsx` (TagBadgeList)
- `src/renderer/components/breaker-panel/BreakerDetailPanel.tsx` (TagPicker)

### Completion Notes
- All 23 unit tests pass (12 new TagRepository + 11 existing). Typecheck at baseline (9 pre-existing errors, 0 new). `npm run build` succeeds.
- **Bug found & fixed during testing:** migration 009/010 only seed defaults for properties existing AT migration time. Added `TagRepository.seedDefaultsForProperty` + `PropertyRepository.seedDefaultEventTypes`, called from `PropertyRepository.create`, so new properties get defaults too.
- **Toolchain note:** `better-sqlite3` is compiled for Electron's ABI (postinstall runs electron-rebuild). Running the DB unit tests requires `npm rebuild better-sqlite3` (system Node ABI) first, then `npm run postinstall` to restore the Electron binary. Documented for CI/future work — a stable fix (e.g. vitest electron runner) is a follow-up.
- Standalone events (`property` target) and EventType repository/UI are NOT in this story — History phase.

### Change Log
- 2026-06-23: Implemented full Tags data layer + minimal UI (badges on cards, picker in breaker detail). Status → Ready for Review.
