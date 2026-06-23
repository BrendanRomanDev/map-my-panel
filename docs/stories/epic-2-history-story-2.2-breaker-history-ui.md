# Story 2.2: History UI — Breaker Detail Timeline + Add/Edit

**Epic:** 2 — History Events
**Status:** Ready for Review
**Architecture ref:** `docs/front-end-spec-tags-and-history.md`

## Story

As a user, I want to see and manage a service history on a breaker, so I can record what was done, when (editable date), with which event type and optional tag, across one or more targets.

Breaker-detail-first (per Brendan). Entity + global views come in later stories.

## Acceptance Criteria

1. `HistorySection` renders in the breaker detail panel: events newest-first, grouped by year, each showing event type (icon if its tag has one), `occurred_on` date, tag badge, notes, and a `↳ also:` line listing sibling targets when the event spans >1 target.
2. `[+ Add Event]` opens `AddEventModal`: event type (existing or type-to-create), date (defaults today, editable), optional tag, notes, target list (the current breaker pre-checked), `[+ Add more targets]` searchable picker (mixed types). Save → one event + N links.
3. Clicking an event (or its `↳ also:`/edit affordance) opens `EditEventModal`: edit fields, add/remove targets (misclick fix, last link blocked), change/remove tag, delete event.
4. History changes persist immediately on the modal's own Save (the Add/Edit modals are their own save boundary, distinct from the breaker drawer's Save). Cancel/scrim discards.
5. After save/delete, the timeline + any affected card refresh (query invalidation).
6. Empty state: "No history yet. [+ Add Event]".
7. Typecheck baseline (0 new); build succeeds.

## Dev Notes

- House style: single quotes, no semicolons. No Prettier.
- Modals follow the existing scrim + Escape + z-50 convention; nested confirms above.
- AddEventModal/EditEventModal are their OWN save boundary (unlike TagPicker which stages into the host). This is fine: opening a modal is an explicit task; its Save/Cancel is self-contained.
- Use useHistoryForTarget, useEventTypes, useTags hooks.
- Target picker pulls entities (useEntities) + breakers (useBreakers) for the panel; "property" target available for whole-house.

## Dev Agent Record

### File List
**New:**
- `src/renderer/components/history/HistorySection.tsx`
- `src/renderer/components/history/AddEventModal.tsx`
- `src/renderer/components/history/EditEventModal.tsx`
- `src/renderer/components/history/TargetPicker.tsx`

**Modified:**
- `src/renderer/components/breaker-panel/BreakerDetailPanel.tsx` (mount HistorySection)

### Completion Notes
- Typecheck baseline (0 new), build succeeds, 36 tests pass.
- HistorySection: timeline grouped by year, newest first, shows type/date/tag/notes + "↳ also: N other items" for shared events. Click an event → EditEventModal.
- AddEventModal: event type (select or type-to-create), date (defaults today), optional tag, notes, TargetPicker (current breaker pre-checked, mixed types). Save → one event + N links, invalidates affected timelines.
- EditEventModal: edit fields + add/remove targets (diffs against original) + delete (with confirm showing target count).
- TargetPicker: searchable, grouped (Entities/Breakers/Property), multi-select, mixed types.
- Add/Edit modals are their OWN save boundary (z-[60], above the breaker drawer z-50; delete confirm z-[70]). The drawer's own scrim/Save is unaffected.
- Only breaker detail wired this story. Entity detail + global view are 2.3/later.

### Change Log
- 2026-06-23: Implemented breaker-detail History UI (timeline, add/edit/delete, target picker).
