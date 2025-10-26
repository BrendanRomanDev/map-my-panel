# Map My Panel

A desktop application for documenting electrical breaker panels, built with Electron, React, and TypeScript.

## Features

- **4-Step Onboarding Wizard**: Easy setup process
  1. Add rooms (optional) for organizing entities
  2. Add entities (outlets, switches, lights, appliances) to rooms
  3. Configure your breaker panel layout (default 24 positions)
  4. Review and create your panel

- **Entity Management**: Document all electrical entities in your home
  - Multiple entity types: outlets, switches, lights, appliances, HVAC, other
  - Room-based organization
  - Optional location notes for each entity
  - Unmapped entity pool for progressive mapping

- **Breaker Panel Configuration**
  - Visual breaker panel interface
  - Customizable number of positions (2-100)
  - Optional breaker labels for quick identification
  - Support for single-pole and double-pole breakers

- **Local SQLite Database**: All data stored locally for offline-first operation

## Tech Stack

- **Electron** 33.x - Cross-platform desktop runtime
- **React** 18.3 - UI framework with hooks
- **TypeScript** 5.x - Type-safe development
- **Vite** 5.x - Fast build tooling via electron-vite
- **Tailwind CSS** 3.4 - Utility-first styling
- **SQLite** (better-sqlite3) - Local database
- **React Query** (@tanstack/react-query) - IPC call caching
- **Zustand** 4.5 - State management
- **@electron/rebuild** - Native module rebuilding for Electron

## Project Structure

```
map-my-panel/
├── src/
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── db/
│   │   │   ├── database.ts     # SQLite initialization & migrations
│   │   │   └── repositories/   # Data access layer
│   │   ├── ipc/                # IPC handlers
│   │   └── index.ts            # Main entry point
│   ├── preload/                # IPC bridge
│   │   ├── index.ts            # Type-safe IPC API
│   │   └── index.d.ts          # Type declarations
│   ├── renderer/               # React frontend
│   │   ├── components/
│   │   │   ├── onboarding/     # 4-step wizard
│   │   │   └── layout/         # Main app layout
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # React entry point
│   └── shared/
│       └── types/              # Shared TypeScript types
├── docs/                       # Project documentation
│   ├── prd.md                  # Product Requirements
│   ├── front-end-spec.md       # UI/UX Specification
│   └── architecture.md         # Technical Architecture
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 10+

### Installation

```bash
# Install dependencies (postinstall will automatically rebuild native modules)
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

The application window will open automatically. The first time you run the app, you'll see the 4-step onboarding wizard.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Type Checking

```bash
# Check all TypeScript types
npm run typecheck

# Check only main/preload process types
npm run typecheck:node

# Check only renderer process types
npm run typecheck:web
```

## Database Schema

The application uses SQLite with three main tables:

### Panels
- Stores breaker panel metadata
- Configurable total positions (2-100)

### Breakers
- Each breaker has a position, type, amperage, and optional label
- Foreign key to panel with CASCADE delete
- Can be 'active' or 'spare' status

### Entities
- Electrical entities (outlets, switches, lights, etc.)
- Optional room grouping
- breaker_id can be NULL (unmapped entities)
- Foreign key to panel with CASCADE delete
- Foreign key to breaker with SET NULL delete

## IPC API

Type-safe communication between main and renderer processes via `window.electronAPI`:

```typescript
// Panels
await window.electronAPI.panels.create({ name: 'Main Panel', total_positions: 24 })
await window.electronAPI.panels.getCurrentOrNull()

// Breakers
await window.electronAPI.breakers.createBatch(breakerInputs)
await window.electronAPI.breakers.listByPanel(panelId)

// Entities
await window.electronAPI.entities.create(entityInput)
await window.electronAPI.entities.listUnmapped(panelId)
await window.electronAPI.entities.groupByRoom(panelId)
await window.electronAPI.entities.assignToBreaker(entityIds, breakerId)
```

## Development Status

### ✅ Completed
- Project initialization with electron-vite
- TypeScript configuration for main, preload, and renderer
- SQLite database with migration system
- Repository pattern for data access
- Type-safe IPC handlers and preload bridge
- React Query setup for IPC caching
- 4-step onboarding wizard
- Basic main application layout

### 🚧 Next Steps
- Implement visual breaker panel component
- Entity sidebar with filtering (All, Room, Breaker, Unmapped)
- Breaker detail slide-out panel
- Entity assignment modal with multi-select
- Search functionality
- Edit/delete operations for all entities
- Data export functionality

## Documentation

See the `docs/` directory for detailed documentation:
- **PRD** (`docs/prd.md`): Product requirements with user stories
- **Front-End Spec** (`docs/front-end-spec.md`): UI/UX design specification
- **Architecture** (`docs/architecture.md`): Complete technical architecture

## License

MIT
