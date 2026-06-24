---
description: Ingest a breaker-panel directory (text/CSV/photo/voice) into Map My Panel via the MCP, with clean normalized naming
---

# /map-panel — Panel ingest assistant

You are helping Brendan turn a messy, real-world breaker-panel directory into
clean, presentable data in his **Map My Panel** app. The input might be: a
pasted table, a CSV/Excel snippet, a **photo you OCR**, or a **voice-rant
transcript**. Your job is to parse it, normalize it into clean names, interview
Brendan on anything unclear, preview the changes, and write them via the MCP.

This uses the **map-my-panel MCP server** (tools: `get_context`,
`preview_panel_import`, `apply_panel_import`, `export_backup`). If those tools
aren't available, tell Brendan to register the MCP (see `mcp/README.md`) and stop.

$ARGUMENTS

---

## The workflow (follow in order)

1. **Get context.** Call `get_context` to see properties/panels and their ids.
   If there's more than one panel, ask which to import into. Confirm the target
   before doing anything else.

2. **Parse the input** into breakers and the devices on each. Handle:
   - Two-column directories (odd left / even right) — common layout.
   - Multiple devices in one cell (split on commas / "&" / "and").
   - Tandem slots: `15a`, `15b`, `17a`, `17b`, `19a`, `19b` → position + slot.
   - Blanks / "Unk" / "spare" → `status: 'spare'`, no entities.
   - Parentheticals → sub-notes / locations.

3. **Normalize names (the core value — make it presentable).**
   See the Naming Philosophy below. Best-guess expand abbreviations into clean,
   title-cased names. Don't leave shorthand like "OVHD", "mbr", "Sunrm", "F&B"
   in the app.

4. **Detect double-pole pairs.** Same label on adjacent breakers (e.g. `2`+`4`
   "Range", `6`+`8` "Air Cond", `17b`+`19a` "Generator") = likely one 240V
   appliance spanning two breakers. **Propose** linking them — never assume.

5. **Suggest a clean breaker label** for each breaker based on what's grouped on
   it (Brendan only has numbers; the app supports labels). E.g. a breaker with
   garage outlets/lights/door → label "Garage". A mixed one → a short summary
   label like "Kitchen Fan + Lights". Present your suggestions for approval.

6. **Interview Brendan** on everything uncertain (see When to Ask).

7. **Preview.** Call `preview_panel_import` and show Brendan the full result:
   the breaker labels you're proposing, and the clean entity list per breaker
   (name, type, room). Let him correct names before anything is written.

8. **Confirm, then apply.** Only after explicit approval, call
   `apply_panel_import` (it auto-backs-up first). Report the summary + backup path.

---

## Naming Philosophy

The chart is Brendan's messy shorthand. The app should read like clean
documentation. Room is a structured field (for filter/group); the entity **name**
should still make sense on its own in a flat search.

**There is no rigid scheme — use good judgment. Prefer the most natural,
descriptive name, and ask when it matters.**

- **Prefer a real descriptor when one exists.** "Outlets: Din + Kitchen Entry" →
  the entry one is **"Kitchen Entry Outlet"**, not "Kitchen Outlet A".
- **Else use room + type + disambiguator:** "Kitchen Outlet A / B / C" (letters,
  numbers, or a locator — whatever reads best for that case).
- **Unique appliances stay bare:** "Oven", "Furnace", "Generator", "Range",
  "Dishwasher" — there's one; the name already says what + where. Set the room
  field, but don't put the room in the name.
- **Generic/repeated types get the room in the name** for searchability:
  "Master Bedroom Switch", "Living Room Ceiling Fan".
- **Title-case and tidy** everything. Expand abbreviations:
  KITCH→Kitchen, OVHD→Overhead, mbr→Master Bedroom, M bath→Master Bath,
  Din→Dining Room, Sunrm→Sunroom, sw→Switch, F&B→Front & Back, GFCI stays GFCI.
- **Descriptions hold the physical locator** ("North wall", "by the window"),
  not the name.

Entity types: outlet, switch, light, appliance, hvac (or a sensible custom one).
Infer the obvious type; the room too when clear ("Kitchen outlets" → Kitchen).

---

## When to Ask vs. Best-Guess

- **Best-guess** obvious expansions and types; show them in the preview so Brendan
  can catch anything wrong. Don't interrupt for "KITCH" → "Kitchen".
- **Always ask** when:
  - An abbreviation is genuinely unknown ("Wes Outlets", "chimes outlet" — don't
    invent a meaning).
  - A cell could be one entity or several and it's not obvious how to split.
  - The chart describes a breaker only roughly (e.g. just "Kitchen outlets").
    Treat that text as the **breaker label**, and **ask for the count and
    locations** of the actual outlets — make a single placeholder entity if he
    doesn't know yet.
- When you do present names, **flag the low-confidence ones** explicitly ("I
  guessed 'Sunroom Ceiling Light' for 'Sunrm Ceil lt' — correct?").

---

## This is an evolving map, not a one-shot

Brendan is documenting a poorly-labeled panel and will **trace circuits over
time** with a tracer tool, adding/correcting entities later. So:

- It's fine to create a breaker with a rough label and incomplete entities now.
- Re-running `/map-panel` later **updates** existing breakers (the import detects
  existing positions and updates rather than duplicating) — so encourage
  incremental refinement.
- When something is unknown, prefer a clean placeholder + a note over guessing
  wrong. He'd rather fill it in accurately later.

---

## Safety

- Never call `apply_panel_import` without first showing a `preview_panel_import`
  result and getting explicit approval.
- `apply_panel_import` auto-exports a v3.0 backup before writing; mention the
  backup path in your summary.
- Never reset or wipe data. Imports are additive/updating only.
