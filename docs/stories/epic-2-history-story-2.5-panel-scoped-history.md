# Story 2.5: Panel-Scoped History Filter

**Epic:** 2 — History Events
**Status:** Done _(pending release)_
**Refs:** FEATURE_REQUESTS #0; `docs/prd/epic-1-2-tags-history.md`

## Story

As a user with a property that has multiple panels (e.g. "55 Center" has two),
I want to filter the global Property History view **by panel** (Global / Panel 1 /
Panel 2 / …), so a breaker change on one panel isn't mixed in with another panel's
history. Property-level events (utility visit, meter install — `target_type='property'`)
appear only under "Global".

## Background / Decision

History is currently property-scoped only (`HistoryRepository.listForProperty`).
The polymorphic `event_links` model already supports panel/breaker/entity/property
targets, so panel scope is **derivable from the target** — no schema change, no
`panel_id` column on `history_events` (decided 2026-06-25, derive-from-target).

## Acceptance Criteria

1. New repo method `listForPanel(panelId)` returns events whose target is:
   - the panel itself (`target_type='panel'`, that id), OR
   - a breaker on that panel (`target_type='breaker'`), OR
   - an entity on that panel (`target_type='entity'`).
   Deduped by event id, newest `occurred_on` first, returned as `HistoryEventWithDetails`.
2. `history:listForPanel` IPC handler + preload `electronAPI.history.listForPanel` + a `useHistoryForPanel(panelId)` hook.
3. The **Property History view** gets a scope selector: **Global** (current behavior,
   `listForProperty`) + one entry per panel in the property. Default = Global.
4. Selecting a panel shows only that panel's events (per AC#1). Property-targeted
   events show only under Global.
5. Single-panel properties: the selector may still show (Global + the one panel) or
   be hidden — either is fine; don't break the existing single-panel experience.
6. Typecheck baseline (0 new); build succeeds; a unit test covers `listForPanel`
   (panel/breaker/entity targets included; another panel's events excluded; property
   events excluded from a panel view).

## Dev Notes

- House style: single quotes, no semicolons. No Prettier.
- `listForPanel`: join `event_links` → events; resolve breaker/entity targets to
  this panel via `breakers.panel_id` / `entities.panel_id`. Reuse the existing
  `decorate()` for details. Mirror `listForBreakerRollup`'s dedupe pattern.
- The view already takes `propertyId` + `panelId` (`PropertyHistoryView`); add the
  panel list via the panels-for-property query already used in MainLayout.
- This is renderer + main; no migration.

## Tasks / Subtasks

- [ ] `HistoryRepository.listForPanel(panelId)` + unit test
- [ ] IPC handler `history:listForPanel` + preload + `useHistoryForPanel` hook + query key
- [ ] Panel scope selector in `PropertyHistoryView` (Global default)
- [ ] Wire selector → useHistoryForProperty (Global) vs useHistoryForPanel (panel)
- [ ] typecheck + tests + build

## Dev Agent Record

### File List
**Modified:**
- `src/main/db/repositories/HistoryRepository.ts` (listForPanel)
- `src/main/ipc/historyHandlers.ts`, `src/preload/index.ts` (history:listForPanel)
- `src/renderer/hooks/useHistory.ts` (useHistoryForPanel), `src/renderer/lib/queryKeys.ts` (byPanel)
- `src/renderer/components/history/PropertyHistoryView.tsx` (panel scope selector)
- `tests/integration/HistoryRepository.test.ts` (listForPanel test)

### Completion Notes
- listForPanel derives panel from target (panel/breaker/entity → panel_id); property-only events excluded. No migration.
- Scope selector only renders when the property has >1 panel (single-panel UX unchanged).
- 60 tests pass (1 new), typecheck baseline (0 new), build succeeds.
- Ships in the next build (needs a fresh DMG to use in the installed app).

### Change Log
- 2026-06-26: Panel-scoped history filter implemented.
