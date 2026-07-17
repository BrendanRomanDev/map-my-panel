<img width="923" height="804" alt="MapMyPanel-Tasks" src="https://github.com/user-attachments/assets/77ea9b1f-7459-478e-9148-15bbf418715b" /><img width="923" height="804" alt="MapMyPanel-Tasks" src="https://github.com/user-attachments/assets/4ada0cde-6c9e-4de6-899d-833bd93ce3da" /># Map My Panel

A desktop app for documenting electrical breaker panels. Map every outlet, switch, light, and appliance in your home to the breaker that controls it. Built with Electron, React, and TypeScript. Runs fully offline — your data stays on your machine.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

<!--
  Hero screenshot. Drop a PNG at docs/screenshots/hero.png.
  Recommended: the main breaker panel grid view with a populated panel — wide
  aspect ratio (around 1600x1000), light or dark theme, your call.
-->

Dashboard
<img width="923" height="804" alt="MapMyPanel-Dash" src="https://github.com/user-attachments/assets/22a5be49-ca3e-494a-90e2-a3d10c8878d9" />

Add Entities
<img width="923" height="804" alt="MapMyPanel-AddEnt" src="https://github.com/user-attachments/assets/324a94f1-36e3-4239-93a7-e89c3d284097" />

Track Dynamic Tasks & Todos
<img width="923" height="804" alt="MapMyPanel-Tasks" src="https://github.com/user-attachments/assets/3b077168-f0f1-4424-9dfa-662900e236a6" />

Log Maintenance History
<img width="923" height="804" alt="MapMyPanel-History" src="https://github.com/user-attachments/assets/06e952dd-3bc2-43ad-8492-c8cffee987cb" />

Configure & Export PDF
<img width="923" height="804" alt="MapMyPanel-Settings" src="https://github.com/user-attachments/assets/53221e3a-b8a1-423b-8f77-a9b22fbd8f4c" />


---

## Download & Install

Grab the latest installer from the [Releases page](https://github.com/BrendanRomanDev/map-my-panel/releases).

### macOS

1. Download `Map.My.Panel-x.y.z.dmg`
2. Open the `.dmg` and drag the app to `Applications`
3. First launch: right-click the app → **Open** (Gatekeeper will warn that the app is unsigned — this is expected for v0.1.x; click **Open** to proceed)

### Windows

1. Download `Map.My.Panel.Setup.x.y.z.exe`
2. Run the installer
3. First launch: SmartScreen may warn that the publisher is unknown — click **More info** → **Run anyway**

> Installers are unsigned for the initial release. If you'd rather build from source, see the [Development](#development) section.

---

## Features

- **Multi-property support** — track multiple homes or buildings in one install
- **Visual breaker panel** — layout matches a real panel (left/right columns, numbered positions)
- **Tandem breaker support** — base positions, expandable views, container flags
- **Entity catalog** — outlets, switches, lights, appliances, HVAC, and custom types you define
- **Room organization** — group entities by room with collapsible sections
- **Breaker linking** — map a single entity across multiple breakers (e.g., a 240V appliance)
- **Search** — intelligent entity search with relevance scoring
- **PDF export** — generate a printable summary of any panel
- **Backup & restore** — full database export/import as JSON
- **Light + dark themes**

---

## Cross-Machine Use

Map My Panel doesn't sync to the cloud — your data is local. To use the same data on a second machine:

1. On machine A: **Settings → Backup → Export** (saves a `.json` file)
2. Move the JSON to machine B (Dropbox, iCloud, AirDrop, USB, email yourself — whatever works)
3. On machine B (fresh install): **Settings → Backup → Import** (or import during onboarding)

The JSON is a full snapshot — panels, breakers, entities, properties. Import replaces the current data. Export regularly if you work across machines.

---

## Development

### Prerequisites

- Node.js 18+ and npm 10+

### Setup

```bash
git clone https://github.com/BrendanRomanDev/map-my-panel.git
cd map-my-panel
npm install   # postinstall rebuilds better-sqlite3 for Electron
```

### Run in dev mode

```bash
npm run dev   # opens the app with hot reload
```

### Type-check

```bash
npm run typecheck         # main + renderer
npm run typecheck:node    # main process only
npm run typecheck:web     # renderer only
```

### Tests

```bash
npm run test:unit   # vitest
npm run test:e2e    # playwright
```

### Build installers

```bash
npm run build:mac   # .dmg into ./release/
npm run build:win   # .exe (NSIS) into ./release/
npm run build:all   # both
```

---

## Talk to your panel via Claude Code (MCP)

If you have this repo and [Claude Code](https://claude.com/claude-code), there's
an **MCP server + `/map-panel` command** that lets you populate the app by
*talking to it* instead of clicking through the UI. Paste your breaker directory
(text or CSV), drop a **photo** of your panel door label, or even a **voice-rant
transcript** from walking the house — Claude parses it, cleans up the messy
shorthand into presentable names, interviews you on anything unclear, previews
the changes, and writes them into the same database the app reads. Open the app
afterward and it's all there.

This is a **developer tool, not part of the installed app** — it runs from source
and writes to your local database directly (through the app's own data layer, so
all the rules apply, and it auto-backs-up before writing).

```bash
# One-time native-module setup (lets the MCP and app share the DB binary)
npm run mcp:setup

# Register the MCP with Claude Code
claude mcp add map-my-panel -- npx tsx ./mcp/server.ts
# then restart Claude Code, and run /map-panel in a session
```

See [`mcp/README.md`](./mcp/README.md) for full setup and
[`docs/architecture-mcp-ingest.md`](./docs/architecture-mcp-ingest.md) for the design.

---

## Tech Stack

- **Electron 33** — cross-platform desktop runtime
- **React 18.3** — UI framework
- **TypeScript 5.6** — type safety
- **Vite 5** — bundling via `electron-vite`
- **Tailwind CSS 3.4** — styling
- **better-sqlite3** — local database
- **@tanstack/react-query** — IPC call caching
- **Zustand** — client state
- **electron-builder** — installer packaging

---

## Project Structure

```
map-my-panel/
├── src/
│   ├── main/          # Electron main process (Node)
│   │   ├── db/        # SQLite, migrations, repositories
│   │   └── ipc/       # Type-safe IPC handlers
│   ├── preload/       # IPC bridge (contextBridge)
│   ├── renderer/      # React frontend
│   │   └── components/ {onboarding, breaker-panel, entities, layout, property, settings, shared}
│   └── shared/types/  # Types used by main + renderer
├── docs/              # PRD, architecture, UX spec
├── electron.vite.config.ts
└── electron-builder.yml
```

---

## Data Model (Quick Reference)

- **Property** — a home or building. You can have multiple.
- **Panel** — a breaker panel belonging to a property. Configurable position count (2-100).
- **Breaker** — a position in a panel. Single-pole, double-pole, or tandem.
- **Entity** — an outlet, switch, light, appliance, etc. May be assigned to one or more breakers, or unmapped.

The SQLite database lives in your OS app-data directory:

- macOS: `~/Library/Application Support/map-my-panel/map-my-panel.db`
- Windows: `%APPDATA%\map-my-panel\map-my-panel.db`
- Linux: `~/.config/map-my-panel/map-my-panel.db`

---

## Documentation

See `docs/` for deeper specs:

- `docs/prd.md` — product requirements & user stories
- `docs/architecture.md` — technical architecture
- `docs/front-end-spec.md` — UI/UX specification
- `docs/architecture-mcp-ingest.md` — the Claude Code MCP ingest server design
- `mcp/README.md` — MCP server setup & usage
- `CHANGELOG.md` — release notes
- `FEATURE_REQUESTS.md` — backlog of ideas

---

## License

MIT — see [LICENSE](LICENSE).
