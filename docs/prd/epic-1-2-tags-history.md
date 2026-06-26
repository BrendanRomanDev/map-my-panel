# Epics 1 & 2 — Tags & Service History

**Status:** Delivered — shipped in **v0.2.0** (2026-06-23)
**Design docs:** `docs/architecture-tags-and-history.md`, `docs/front-end-spec-tags-and-history.md`
**Stories:** `docs/stories/epic-1-*`, `docs/stories/epic-2-*`

## Epic Goal

Let users document electrical *conditions* and *work over time* on their panel:
reusable tags (e.g. "No Ground", "Self-Grounding", "GFCI Protected") attachable to
breakers/entities, and a dated history/service-event system attachable to entities,
breakers, panels, or the whole property.

## Epic 1 — Tags

| Story | Title | Status |
|-------|-------|--------|
| 1.1 | Tag data layer (schema, repo, IPC, tests) | Done (Released v0.2.0) |
| 1.2 | Tag Manager (Settings) + default icons/colors | Done (Released v0.2.0) |

Plus (organic, post-1.2): tag badges on cards with condense-to-icon, staged
save/cancel in modals, entity-level tag picker.

## Epic 2 — History Events

| Story | Title | Status |
|-------|-------|--------|
| 2.1 | History data layer (events + links + event types) | Done (Released v0.2.0) |
| 2.2 | Breaker-detail history UI (timeline + add/edit) | Done (Released v0.2.0) |
| 2.3 | Entity history + breaker roll-up + global Property History tab | Done (Released v0.2.0) |
| 2.4 | Event-Type manager (Settings) | Done (Released v0.2.0) |

### Epic 2 — additional delivered work (organic, no separate story; tracked here)

- **Double-pole history sharing + staged linking rebuild** — linking/unlinking
  staged until Save, validates against already-paired breakers, opt-in merge/log,
  history preserved on split. (Commits: 69467be, f3e6f1c, 4e02aac, 59e7f52, d041352)
- **Hardening** — backup v3.0 (tags+history), migration 012 polymorphic-link
  integrity triggers, typecheck baseline cleared, dev-port fix.
  (Commits: 7142dbb, 70c8764, 1524012, 87b5aac)

## Acceptance (met)

- Tags: create/edit/delete, color+icon, condense behavior, attach to breaker/entity,
  per-property + global scoping. Composable grounding scheme in real use.
- History: dated events (editable occurred-on), event types, optional tag, multi-
  target; per-breaker (with entity roll-up), per-entity, and global Property History.
- Backward-compatible backup (v3.0); DB-level integrity for polymorphic links.
- Shipped in v0.2.0 DMG + GitHub release. ~59 tests passing.

## Known follow-up (next story)

- **Panel-scoped history** — the global Property History view is property-scoped;
  for multi-panel properties it mixes panels. See `docs/stories/epic-2-history-
  story-2.5-panel-scoped-history.md` (next). Tracked as FEATURE_REQUESTS #0.
