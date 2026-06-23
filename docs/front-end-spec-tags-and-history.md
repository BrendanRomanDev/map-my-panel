# Tags & History — Front-End Spec

**Author:** Sally (UX Expert)
**Date:** 2026-06-23
**Status:** Draft
**Related:** [Architecture](./architecture-tags-and-history.md) | [Base UI Spec](./front-end-spec.md)

This spec defines the UI/interaction design for the Tags and History Event features. It extends the base front-end spec and reuses existing patterns (theme-aware semantic badges, modal/drawer conventions with scrim + Escape, the Settings "Manage Custom Types" management pattern).

---

## Design Decisions (confirmed with Brendan)

| Decision | Choice |
|----------|--------|
| Tag hover popover content | Tag **name + description** (new `description` field on tags) |
| Card condense rule | **Per-tag `condense` flag AND an overflow cap** — surplus collapses to `+N ▾` |
| Tag placement | Both **breaker cards and entity cards** |
| Global history view | **New top-level tab/view** in main nav |
| Shared-event `↳ also:` click | Opens **full event detail** (EditEventModal) to view/fix targets |
| Bulk-add target types | **Mixed targets allowed** (entities + breakers + panel + property in one event), picker groups by type |
| Standalone events | Entity/breaker **optional**. An event with no specific target auto-attaches to the **property** (`target_type='property'`) and appears in global history. For whole-house notes like a utility-company incident. |
| Custom event types | Event-type field is **type-to-create inline** (saved for reuse), like custom entity types. Seeds include `Note` and `Inspection (Third Party)`. |
| History timeline order | Reverse-chronological by `occurred_on`, grouped by year |
| Date field | `occurred_on` defaults to today, freely editable (separate from immutable log date) |

---

## Surface 1: Tags on Cards (display + condensed badges)

Tags render in a **second badge row** beneath the existing type/room row on `EntityCard` and `BreakerCard`.

```
┌─────────────────────────────────────────────┐
│ Kitchen Counter Outlet              ⚠ ✏      │
│ [outlet]  📍 Kitchen                          │
│ 🍴 Self-Grounding  ⚡ GFCI  +2 ▾              │  ← tag row
└─────────────────────────────────────────────┘
```

**Render rules:**
- `condense = true` tags → icon only (🍴), no text. Hover → popover (name + description).
- `condense = false` tags → full text badge ([GFCI Protected]).
- Apply an overflow cap (proposed: ~3 visible badges, tunable). Surplus collapses to a `+N ▾` chip; click → popover listing the rest.
- Badge colors use existing theme-aware semantic color keys (see `b387fb5`).

**Components:** `TagBadge` (single), `TagBadgeList` (handles condense + overflow + popovers).

---

## Surface 2: History Viewer / Timeline (per-target)

A `HistorySection` mounted in the entity/breaker/panel detail views. Reverse-chronological, grouped by year.

```
┌─ History ──────────────────────── [+ Add Event] ─┐
│  2026                                              │
│  ┌────────────────────────────────────────────┐  │
│  │ 🔧 Outlet Change          Jun 20, 2026   ✏ │  │
│  │ 🍴 Self-Grounding                            │  │
│  │ Replaced 2-prong w/ self-grounding outlet    │  │
│  │ ↳ also: Outlet B, Hallway Outlet  (+2)       │  │
│  └────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

- Each entry: event-type (icon+name), `occurred_on` date, attached tag (if any), notes, and a `↳ also:` line listing sibling targets when the event spans >1 target.
- `↳ also:` is clickable → opens `EditEventModal` (full event, all targets, add/remove).
- Edit pencil → `EditEventModal`.
- Empty state: `No history yet. [+ Add Event]`.

---

## Surface 3: Add Event Flow (single + bulk)

`AddEventModal`, triggered from any history viewer's `[+ Add Event]` or a panel-grid multi-select.

```
┌─ Add History Event ─────────────────────────────┐
│  Event Type    [ Outlet Change          ▾ ]     │
│  Date          [ 2026-06-20            📅 ]     │
│  Tag (opt.)    [ 🍴 Self-Grounding      ▾ ] [+] │
│  Notes         [ Replaced 2-prong...        ]    │
│  Applies to:                                     │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ Son's Room — Outlet A      [entity]      │  │
│  │ ✓ Son's Room — Outlet B      [entity]      │  │
│  │ ☐ Son's Room — Outlet C      [entity]      │  │
│  │ ✓ Hallway — Front Outlet     [entity]      │  │
│  │ [+ Add more targets...]                    │  │
│  └──────────────────────────────────────────┘  │
│  3 selected        [ Cancel ]   [ Save Event ]   │
└──────────────────────────────────────────────────┘
```

- Opening from a target pre-checks that target.
- `[+ Add more targets]` → searchable picker across the property; **mixed types allowed**, grouped by type (Entities / Breakers / Panel).
- Date defaults to today, editable.
- Event Type: type-to-create inline (e.g. `Note`, `Third Party`).
- Tag: pick existing or `[+]` create inline.
- **Targets are optional.** If none selected, the event auto-attaches to the **property** — used for standalone whole-house notes (e.g. "utility came back Monday, meter was sizzling / improperly installed"). These show in the global Property History.
- Save → one `history_events` row + N `event_links` (or one property link if none chosen), in one transaction.

### Standalone "quick note" entry point

The global Property History view (Surface 4) has its own `[+ Add Event]` that opens `AddEventModal` with **no target pre-checked** — the fast path for logging a property-level note/incident.

`EditEventModal` = same form, pre-filled, plus add/remove targets (misclick fix) and a delete-event action.

---

## Surface 4: Global Property History (new top-level view)

A `PropertyHistoryView` in the main nav. Aggregates all events across the property.

```
┌─ Property History ───────────────────────────────────┐
│  Filter: [All Types ▾] [All Tags ▾]  🔍 [search...]   │
│  2026                                                  │
│  │ 🔧 Outlet Change   Jun 20   → 4 outlets    ✏      │
│  │ ⚡ Meter Install    Jun 02   → Main Panel   ✏      │
└────────────────────────────────────────────────────────┘
```

- Same entry card style as Surface 2; target summary shows count/primary target.
- Filters: event type, tag, free-text search over title/notes.
- Where panel-level events (outages, meter installs) are most visible.

---

## Settings: Management UIs

Mirror the existing **"Manage Custom Types"** section pattern in `SettingsView`. Per CLAUDE.md thin-page principle, build as separate components (not inline in the 1,870-line SettingsView).

- **`TagManager`** — list property + global tags; create/edit/delete; edit name, description, color, icon (emoji picker), condense flag; a "share across all properties" toggle at creation (sets `property_id = null`).
- **`EventTypeManager`** — list property + global event types; create/edit/delete; defaults seeded per property.

---

## Component Inventory (UI)

| Component | Surface | Notes |
|-----------|---------|-------|
| `TagBadge` | 1 | single badge or icon |
| `TagBadgeList` | 1 | condense + overflow + popovers |
| `TagPicker` | 3, detail panels | attach/detach/create-inline |
| `HistorySection` | 2 | per-target timeline |
| `AddEventModal` | 3 | single + bulk, target picker |
| `EditEventModal` | 2, 3 | edit + add/remove targets + delete |
| `TargetPicker` | 3 | searchable, mixed-type, grouped |
| `PropertyHistoryView` | 4 | top-level aggregated view |
| `TagManager` | Settings | manage tags |
| `EventTypeManager` | Settings | manage event types |

---

## Schema impact from UX

- **Added `tags.description`** (TEXT, nullable) for the hover popover — folded into migration 009.

No other schema changes required — the data model from the architecture doc supports every interaction above.
