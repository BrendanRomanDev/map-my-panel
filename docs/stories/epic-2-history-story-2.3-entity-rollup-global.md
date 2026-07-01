# Story 2.3: Entity History + Roll-up + Global History Tab

**Epic:** 2 — History Events
**Status:** Done _(Released v0.2.0)_
**Architecture ref:** `docs/front-end-spec-tags-and-history.md`

## Story

From hands-on testing of 2.2, four refinements: entity-level history with bubble-up to breakers, a dedicated global History tab, the breaker drawer's history moved to the bottom, and a history button on entity cards.

## Acceptance Criteria

1. **Roll-up:** a breaker's history shows direct breaker events PLUS events on entities assigned to it, each marked `via <entity>`. Deduped by event id (direct wins). (`HistoryRepository.listForBreakerRollup`.)
2. **Global History tab:** a top-level view (header clock icon) listing all property events, with type/tag/text filters and an Add Event entry that can span targets across breakers, or attach to none (standalone whole-property note).
3. **Breaker drawer:** History moved to the BOTTOM (below the form), compact (recent few) with a "View full history" link.
4. **Entity card:** a clock-icon button opens that entity's history in a modal.
5. Reuses AddEventModal/EditEventModal/TargetPicker via a shared HistoryTimeline.
6. Typecheck baseline (0 new); build succeeds; tests pass (incl. rollup + dedup).

## Dev Agent Record

### File List
**New:**
- `src/renderer/components/history/HistoryTimeline.tsx` (shared presentational timeline)
- `src/renderer/components/history/PropertyHistoryView.tsx` (global tab)
- `src/renderer/components/history/EntityHistoryModal.tsx` (entity card viewer)

**Modified:**
- `src/shared/types/index.ts` (RolledUpHistoryEvent)
- `src/main/db/repositories/HistoryRepository.ts` (listForBreakerRollup)
- `src/main/ipc/historyHandlers.ts`, `src/preload/index.ts` (rollup IPC)
- `src/renderer/lib/queryKeys.ts`, `src/renderer/hooks/useHistory.ts` (useBreakerHistoryRollup)
- `src/renderer/components/history/HistorySection.tsx` (rollup mode, compact + onViewFull, uses HistoryTimeline)
- `src/renderer/components/breaker-panel/BreakerDetailPanel.tsx` (history moved to bottom, compact)
- `src/renderer/components/entities/EntityCard.tsx` (history button + modal)
- `src/renderer/components/layout/MainLayout.tsx` (History tab/view + header toggle)
- `tests/integration/HistoryRepository.test.ts` (rollup + dedup tests)

### Completion Notes
- 38 tests pass (2 new rollup tests). Typecheck baseline (0 new), build succeeds.
- Roll-up query: direct breaker links UNION events on entities whose breaker_ids JSON contains the breaker; deduped, direct wins, `via` marks source entity.
- The cross-breaker batch use case is now solvable: open Property History → Add Event → pick outlets across breaker A and B in one event.
- Breaker drawer "View full history" link calls optional onViewHistory (not yet threaded through BreakerPanelGrid → global tab; the header clock icon is the primary access for now). Follow-up: thread it so the link deep-links.
- Entity history modal queries the panel for property_id (query-where-needed).

### Change Log
- 2026-06-23: Entity history button + modal, breaker roll-up, global History tab, drawer history moved to bottom.
