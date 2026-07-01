# Story 4.3: Tag-Wired Tasks (rules, templates, bulk)

**Epic:** 4 — Tasks
**Status:** ✅ Done (shipped 2026-06-29)
**Refs:** `docs/prd/epic-4-tasks.md`

## Story

As a user, I want to connect a task to a tag with completion rules, so finishing
a task updates the entity's tags/history exactly as I configured — making the
app's machinery (not its opinions) drive my workflow. I also want to save these
as templates and apply one task to many entities at once.

## The model (decisions locked 2026-06-29)

Completion rules live **on the task itself** as JSON columns (no new rules table):
- `on_create_tag_id` (nullable) — tag applied to the entity when the task is created.
- `on_complete_remove_tag_ids` (JSON array) — tags removed from the entity on complete.
- `on_complete_add_tag_ids` (JSON array) — tags added on complete.
- `on_complete_log_history` (0/1) — log a history event on complete.

Behavior:
- **On create:** if `on_create_tag_id` set and the entity doesn't already have it,
  attach it. If it already has it, the task just links conceptually (no dup).
- **On complete:** apply remove/add tag changes + optional history event, then mark done.
  (This generalizes today's hardcoded self-ground path into user config.)

## Capabilities (all four, v1)

1. **Task↔tag wiring + completion rules** — the core above, in the Add/Complete UI.
2. **Inline tag color/icon** — when creating a tag within the task flow, set color + emoji.
3. **Task templates** — save a configured task (type + tag wiring + rules, minus the
   entity) as a reusable `task_templates` row; apply later. Managed list.
4. **Bulk apply** — apply a task/template to MANY selected entities; each gets its own task
   (and its own on-create tag application).

## Acceptance Criteria

1. Migration: add the 4 rule columns to `tasks`; add a `task_templates` table
   (name, task_type, title_template, notes, the same rule columns). Additive.
2. TaskRepository: create honors `on_create_tag_id` (attach to entity); a
   `completeWithRules(id)` applies remove/add tags + optional history in one
   transaction, then marks done. Template CRUD + `createFromTemplate(templateId,
   entityIds[])` (bulk).
3. IPC + preload + hooks for the above.
4. UI — Add Task: pick/create tag (with color/icon), set on-complete rules
   (multiselect: remove tag(s), add tag(s), log history), optional "save as template".
5. UI — Complete Task: shows the configured rules pre-checked, editable, confirm → apply.
6. UI — Bulk: from the Tasks view, "Apply to entities…" → pick a template + multiple
   entities → creates one task each.
7. Tests: rule application (create-attach, complete remove/add/history), template
   create-from (bulk), no-dup on existing tag. Typecheck baseline; build succeeds.
8. **MCP-ready:** repository methods are the single source so a later MCP tool can
   create the same tag-wired tasks. (MCP tools themselves are a separate story.)

## Dev Notes

- Rules as JSON arrays of tag IDs on the task row (mirror entity.breaker_ids JSON pattern).
- Reuse existing tags.attach/detach + history.createEvent for side-effects.
- Replace the current CompleteTaskModal's hardcoded self-ground branch with the
  generic rules-driven flow.
- House style: single quotes, no semicolons. Additive migration only.

## Dev Agent Record

**Completed 2026-06-29.** All 8 ACs met.

- **Migration 014** — `on_create_tag_id`, `on_complete_remove_tag_ids`,
  `on_complete_add_tag_ids`, `on_complete_log_history` on `tasks`; `task_templates`
  table. Additive.
- **TaskRepository** — `create` honors `on_create_tag_id`; `completeWithRules`
  applies remove/add + optional history in one transaction; template CRUD +
  `createFromTemplate` (bulk). IPC + preload + `useTasks`/`useTaskTemplates` hooks.
- **UI** — `TaskRulesEditor` (inline tag create w/ color+icon); AddTaskModal
  (rules + save-as-template + bulk); CompleteTaskModal rewritten to rules-driven
  (hardcoded self-ground branch removed); Templates strip + ApplyTemplateModal.
- **Tests** — TaskRepository rules/templates + no-op safety (remove-missing /
  add-duplicate). Commits `e913026` (backend), `5c964e4` (frontend).

**Scope note:** delivery grew beyond the original 4.3 — polymorphic task targets,
the grouped Tasks view, derived amperage, and the nav refactor were built on top.
Those are recorded in **Story 4.4** (see `epic-4-tasks-story-4.4-*`).
