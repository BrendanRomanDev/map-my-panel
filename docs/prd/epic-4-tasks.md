# Epic 4 — Tasks (entity-linked to-dos)

**Status:** Scoped — ready for stories
**Author:** John (PM) with Brendan
**Date:** 2026-06-26
**Related:** Tags & History (Epics 1–2); FEATURE_REQUESTS #1, grounding-warning idea.

## Problem / Why

Brendan is documenting a poorly-labeled, partly-ungrounded panel and will fix
things **over time** (self-ground outlets, trace unmapped circuits, address dead
switches). Today that "what still needs doing" lives only in his head + tags. He
wants the app to turn its own signals (warnings, condition tags) into a **checkable
to-do list tied to the actual entities**, so progress is tracked and, when done,
the entity's state updates automatically.

## Vision (from Brendan's walkthrough)

- A **task** is attached to an entity (or breaker/panel — TBD) with a description,
  status (open/done), and optionally a type.
- Tasks can be **generated from a signal**:
  - From the **no-breaker warning** → a "Map this — find its breaker" task.
  - From a grounding tag (`Needs Grounding` / `2P`) → a "Self-ground this outlet —
    needs 20A box" task (carrying the spec: amperage, box type).
- **Completing a task updates the entity**: e.g. checking off "self-ground" removes
  `Needs Grounding` + `2P`, adds `3P` + `Self-Grounding`, and can append a
  **history event** (the maintenance log). Checking off "map this" prompts the
  breaker assignment.
- A **task list view** (filter by open/done, by type, by room) — the running
  punch-list for the house.

## Proposed scope (v1)

| # | Capability | Notes |
|---|-----------|-------|
| 1 | `tasks` table + repository + IPC | entity_id (nullable for breaker/panel/property?), title, notes, status, type, created/updated, completed_at |
| 2 | Task list view | open/done filter; group by room or entity |
| 3 | Add/edit/complete task UI | inline on the entity card / detail, plus the list view |
| 4 | Generate-from-warning | "Map this" from no-breaker; "Self-ground" from grounding tags |
| 5 | Completion side-effects | on complete: optional tag changes + optional history event |

## Decisions (locked 2026-06-26)

1. **Task target:** **Entity-only** for v1. (Breaker/panel/property later.)
2. **Completion side-effects:** **Propose & confirm** — completing a task shows the
   intended tag changes + history-event and the user approves/edits before applying.
   Never silent.
3. **History coupling:** part of the same confirm step (optional history event on
   completion, pre-filled, skippable).
4. **Creation:** **Manual add + a "Generate from warnings" button** that scans for
   signals (no-breaker entities; `Needs Grounding` / `2P` outlets) and offers tasks.
5. **Task types/templates:** predefined set (Self-Ground, Map Circuit, Replace
   Outlet, Inspect, Other) + custom, managed like event-types. A generated task
   carries its spec in the description (e.g. "needs 20A box").
6. **v1 size:** **Whole loop at once** — data layer + list/add/complete UI +
   generate-from-warnings + confirmed completion side-effects, in one epic.

## Out of scope (later)

- Scheduling/reminders/dates on tasks.
- Cross-property task dashboard.
- MCP tool for bulk task creation (natural follow-on, not v1).

## Dependencies

- Builds on Tags (Epic 1) + History (Epic 2) for the completion side-effects.
- Reuses the polymorphic-target + repository patterns already established.
