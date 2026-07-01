# Next Steps — Map My Panel

_Handoff written 2026-07-01. Open this first when you return._

## Where things stand

**Shipped & committed** (working tree clean, on `main`):
- Epic 4 Tasks is deep. Stories **4.1–4.4 are Done**:
  - 4.3 — tag-wired tasks (rules, templates, bulk).
  - 4.4 — polymorphic task targets, grouped Tasks view (Flat/By Room/By Breaker),
    derived amperage, nav refactor (real home button), "No room"/"No breaker" verbiage.
- Your **real data** is loaded: Living Room split into 4 outlets, Office 12 tasks,
  the "Self-Ground Outlet" template, reconstructed grounding/confirm tasks.
- Current app version: **v0.3.0** (the built arm64 `.app` is in `release/mac-arm64/`).

**You're running the new build** and living on it "for a while to see where it takes you."

## The next story (teed up)

**Story 4.5 — MCP Task Tools** (`docs/stories/epic-4-tasks-story-4.5-mcp-task-tools.md`)
is written and **Approved** (BMad status = ready to implement). It's MCP wiring only (no data-layer work — the
repository is already MCP-ready). Full tool set: list / create / complete / delete
tasks + templates, so the Claude agent can create and close tag-wired tasks from
your rules. This is the payoff of the whole Epic-4 build.

**To start it next time:** `*agent dev` (or just ask me to implement Story 4.5),
point at that story doc. First decision inside it: `/map-tasks` command vs. keeping
`/map-panel` ingest-only (recommendation in the story: separate command).

## Loose ends (small, optional)

1. **Tag dedup leftovers** — two unused 0-link tags on 110 Amherston (`AFCI
   Protected`, `Reverse Polarity`). Harmless. Delete via the tag manager if you want.
2. **Grounding-task reconstruction** — done, but the memory note
   `reconstruct-grounding-tasks.md` documents the source (your writeup) if you need
   to regenerate more.
3. **Per-group "select all"** in the grouped Tasks view — currently bulk selects
   across all groups; a per-room/breaker select-all is a nice-to-have.
4. **Disk space** — you were at ~92% full; keep an eye on it (the x64 DMG build
   failed for lack of space — arm64-only is fine for you).

## Guardrails (do not break)

- **NEVER reset the DB.** Real production data at
  `~/Library/Application Support/map-my-panel/map-my-panel.db`. Additive migrations
  only. Back up before risky writes (`sqlite3 … .backup`), backups live in
  `~/Documents/map-my-panel-backups/`.
- **House style:** single quotes, no semicolons, no ESLint/Prettier reformatting.
- **App = machinery, agent = judgment.** Tasks/tags/rules are unopinionated;
  electrical judgment (self-ground vs GFCI, etc.) comes from you or the MCP agent.
- **Commit/push only when asked.** Commit messages: no "Generated with Claude Code"
  / no Co-Authored-By.
- **better-sqlite3 ABI dance:** Electron ABI via `npm run postinstall`; system-Node
  ABI (tests/MCP) via `npm rebuild better-sqlite3`.

## Quick resume checklist

- [ ] `git log --oneline -6` — confirm you're on `496bf3b` (nav refactor) or later.
- [ ] `npm run dev` — sanity-run.
- [ ] `npx vitest run` — should be green (rebuild better-sqlite3 first if it errors).
- [ ] Read `docs/stories/epic-4-tasks-story-4.5-mcp-task-tools.md` → start it.

## BMad status
Epic 4 story docs reconciled with delivered work (4.3 Done + 4.4 recorded + 4.5
ready). On the rails.
