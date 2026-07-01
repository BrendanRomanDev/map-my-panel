# Story 4.2: Tasks UI + Generate-from-Warnings + Confirmed Completion

**Epic:** 4 — Tasks
**Status:** Done _(pending release)_

## Dev Agent Record

### File List
**New:** `src/renderer/components/tasks/TasksView.tsx`, `CompleteTaskModal.tsx`, `generateTasks.ts`; `src/renderer/hooks/useTasks.ts`; `tests/integration/generateTasks.test.ts`
**Modified:** `src/renderer/components/layout/MainLayout.tsx` (Tasks tab), `src/renderer/lib/queryKeys.ts` (task keys)

### Completion Notes
- Tasks top-level tab (clipboard icon): list with open/done/all filter, add, complete, reopen, delete.
- Generate-from-warnings: scans for unmapped entities (→ Map Circuit) and Needs-Grounding entities (→ Self-Ground, with 2P note); skips entities that already have a matching open task; user picks which to create.
- Confirmed completion (CompleteTaskModal): for Self-Ground, proposes removing Needs Grounding/2P + adding Self-Grounding/3P; optional history event (pre-filled, editable); all confirmed before applying. Marks task done.
- 69 tests pass (5 TaskRepository + 4 generateTasks), typecheck 0, build OK.

### Change Log
- 2026-06-26: Tasks UI + generation + confirmed completion loop.
**Refs:** `docs/prd/epic-4-tasks.md`

## Story

As a user, I want a task list and entity-level task UI, the ability to generate
tasks from the app's own warnings, and a guided completion that proposes the
resulting tag/history changes — so the app becomes my house punch-list and keeps
entity state in sync when I finish work.

## Acceptance Criteria

### Task UI
1. A **Tasks view** (new top-level tab, next to Property History): lists tasks with
   open/done filter, grouped by room or entity; add/edit/complete/reopen/delete.
2. Entity detail / card shows that entity's open task count + quick add/complete.

### Generate from warnings
3. A **"Generate from warnings"** action scans the current panel and proposes tasks:
   - Entities with **no breaker** → "Map Circuit — find this entity's breaker."
   - Entities tagged **`Needs Grounding`** (and/or `2P`) → "Self-Ground — needs box
     (note amperage)."
   Proposed tasks are shown for review; user picks which to create (no duplicates if
   a matching open task already exists).

### Confirmed completion (the loop)
4. Completing a task opens a **confirm step** showing proposed side-effects, all
   editable/skippable:
   - **Self-Ground** done → remove `Needs Grounding` (+ `2P` if present), add
     `Self-Grounding` (+ `3P`); offer a history event ("Self-grounded outlet").
   - **Map Circuit** done → prompt to assign the entity to a breaker.
   - Generic task → optional history event only.
5. Applying the confirmed changes updates tags + (optionally) logs history + marks
   the task done — in one transaction.

### Quality
6. Tests cover generation (correct candidates, no dupes) and completion side-effects
   (tag flips + history). Typecheck baseline; build succeeds.

## Dev Notes

- Reuse `applyTags`-style logic + the history create path for side-effects.
- The confirm step is the v1 "propose & confirm" decision — never auto-apply silently.
- Tab pattern: mirror how PropertyHistoryView was added to MainLayout (header toggle).

## Dev Agent Record
_(to be filled by dev)_
