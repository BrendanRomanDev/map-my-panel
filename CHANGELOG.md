# Changelog

All notable changes to Map My Panel are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [0.4.0] — 2026-07-17

Grows the Tasks system into a real punch-list and fixes dark-theme visibility.

### Added

- **Grouped Tasks view** — the Tasks tab can now be grouped Flat, By Room, or By Breaker, so you can work the list however makes sense for the job in front of you.
- **Tag-wired tasks** — tasks connect to the tag system, target any thing in the panel (entity, breaker, room), and derive amperage where it applies.
- **Bulk selection in Suggested Tasks** — select all / deselect all when turning suggestions into tasks. (The old "Generate from warnings" flow is now **Suggested Tasks**, and suggestions come from objective panel facts rather than hardcoded tags.)

### Changed

- **Navigation** — going home vs. viewing a panel is now an explicit choice instead of "deselect to return," which was easy to trigger by accident.

### Fixed

- **Dark-theme inputs** — text inputs in Settings (property/panel/room/type names, the delete-confirm fields) rendered white-on-white in dark themes, making the text nearly invisible. They now use the themed background like every other input.
- **Sticky modal footers** — the Add/Edit History Event modals kept their action buttons inside the scroll area, so on tall content you had to scroll to reach Save/Cancel/Delete. Footers (and the history-viewer close button) now stay pinned.

## [0.3.0] — 2026-06-29

Adds a Tasks punch-list and panel-scoped history filtering.

### Added

- **Tasks** — an entity-linked to-do list (new Tasks tab). Add tasks, mark them done/reopen, filter by open/done. **Generate from warnings** scans the panel and proposes tasks for unmapped entities ("Map Circuit") and ungrounded outlets ("Self-Ground"). Completing a task opens a guided step that proposes the resulting changes — e.g. finishing a self-ground flips the grounding tags (remove "Needs Grounding"/"2P", add "Self-Grounding"/"3P") and optionally logs a history event — all confirmed before applying.
- **Panel-scoped history** — the Property History view can now be filtered by panel (Global / per-panel) for properties with more than one panel. Property-level events stay under Global.

### Notes (developer tooling)

- The MCP ingest server gained `add_entities` and `apply_tags` tools and several import fixes during real-data use; documented as Epic 3.


Adds a Tags & Service-History system for documenting electrical conditions and work over time.

### Added

- **Tags** — reusable, color/icon-coded labels (e.g. "No Ground Wire", "Self-Grounding Outlet") attachable to breakers and entities. Crowded cards condense flagged tags to their icon with a hover description. Manage them in Settings (name, description, color, emoji icon, condense flag); ships with sensible defaults.
- **Service History** — dated history events on entities, breakers, the panel, or the whole property. Each event has an editable occurrence date (separate from when it was logged), an event type, optional notes, and an optional tag. Add events to many targets at once (e.g. one "outlet change" across outlets on different breakers).
- **History viewers** — a clock icon on every entity and breaker card opens its history; a breaker's view rolls up events from its assigned entities. A new top-level **Property History** tab shows the full timeline with type/tag/text filters and a standalone "add note" entry point.
- **Event-type management** in Settings (add/rename/delete; deleting keeps the events, just untyped).

### Changed

- Breaker detail drawer now has a dimming scrim and closes on click-outside / Escape.
- Double-pole linking and unlinking is staged until "Save Changes" (no longer persists on dialog confirm), validates against already-paired breakers, and offers opt-in history logging + history merge.
- **Backup format upgraded to v3.0** to include tags & history. Older v1.0/v2.0 backups still import.

### Fixed

- Cleared all pre-existing TypeScript errors (incl. a broken "copy entities from template panel" path).
- Deleting or resetting a panel no longer leaves orphaned tag/history links — enforced at the database layer via triggers, with a one-time cleanup of any existing orphans.
- Dev server pinned to a dedicated port so running two Electron apps no longer cross-launches.

### Tooling (developer-only, not part of the installed app)

- **Claude Code MCP ingest server + `/map-panel` command** — populate the app by talking to Claude Code: paste a breaker directory, a photo, or a voice transcript; it normalizes the names, interviews you, previews, auto-backs-up, and writes via the app's data layer. Runs from source; see `mcp/README.md`.

## [0.1.1] — 2026-05-27

Polish release. No functional changes — same features as v0.1.0.

### Changed

- App icon replaced with the final design (stylized breaker panel with three wires fanning out to three connected devices). The previous v0.1.0 build shipped with a placeholder icon.
- README now has a hero screenshot slot — drop your own screenshot into `docs/screenshots/hero.png` to populate.

## [0.1.0] — 2026-05-27

First public release. The app is feature-complete for documenting residential electrical panels and ready for friends-and-family use.

### Features

- **Multi-property support** — track multiple homes/buildings in one install
- **Panel + breaker grid** — visual breaker panel layout matching real-world numbering
- **Tandem breaker support** — base positions, container flags, expandable views
- **Entities** — items, events, outlets that map to breakers (with linking across breakers)
- **Custom entity types** — define your own beyond the defaults
- **Theming** — light and dark mode with semantic color tokens
- **Search** — intelligent entity search with relevance scoring
- **Backup & restore** — full database export/import as JSON
- **PDF export** — generate a printable summary of a panel
- **Cross-machine portability** — export from one machine, import on another

### Distribution

- macOS `.dmg` installers attached to this release (separate arm64 and x64 builds)
- Windows `.exe` installer planned for v0.1.1
- App is unsigned for v0.1.x — see README for how to bypass Gatekeeper warnings on first launch

### Known limitations

- macOS only for v0.1.0; Windows coming in v0.1.1
- No cloud sync — moving data between machines is manual (export JSON → import JSON)
- Installers are unsigned; signing is on the roadmap once usage justifies the cost
- Linux build not yet provided
