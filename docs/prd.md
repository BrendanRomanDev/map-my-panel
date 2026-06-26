# Map My Panel Product Requirements Document (PRD)

**Version:** 1.1
**Date:** 2026-06-26
**Author:** John (Product Manager) with input from Brendan
**Status:** Living — MVP shipped (v0.1.0); Tags/History shipped (v0.2.0); MCP ingest delivered
**Related Documents:** [Project Brief](./brief.md) · [Epics 1 & 2 — Tags & History](./prd/epic-1-2-tags-history.md) · [Epic 3 — MCP Ingest](./prd/epic-3-mcp-ingest.md)

## Epic Registry (post-MVP)

| Epic | Theme | Status | Detail |
|------|-------|--------|--------|
| MVP (Phase 1) | Visual panel + entity mapping | Released v0.1.0 | this PRD, §Requirements |
| Epic 1 | Tags | Released v0.2.0 | `prd/epic-1-2-tags-history.md` |
| Epic 2 | Service History | Released v0.2.0 | `prd/epic-1-2-tags-history.md` |
| Epic 3 | MCP Ingest Server (dev tooling) | Delivered | `prd/epic-3-mcp-ingest.md` |
| Epic 2.5 | Panel-scoped history | Done (story 2.5) — pending release | story 2.5 |
| Epic 4 | Tasks (entity to-dos) | Done (stories 4.1, 4.2) — pending release | `prd/epic-4-tasks.md` |

---

## Goals and Background Context

### Goals

- Enable DIY homeowners to quickly identify which breaker controls any electrical entity (outlet, switch, light) in their home in under 2 minutes
- Replace fragmented documentation methods (Excel spreadsheets, handwritten notes) with a unified, visual, searchable system
- Provide an offline-first desktop application that works without internet connectivity in basements and attics
- Allow users to progressively build their panel knowledge over time as they perform electrical work
- Deliver a working MVP within 4-6 weeks that Brendan can use to eliminate his Excel-based tracking system
- Create a foundation for future enhancements (circuit topology mapping, mobile companion app, multi-panel support)
- Enable easy sharing of panel configurations with electricians, inspectors, or future homeowners

### Background Context

Homeowners frequently inherit electrical breaker panels that are unlabeled, mislabeled, or documented with cryptic abbreviations that no longer reflect reality after years of renovations. This creates significant friction during DIY electrical work, as every project begins with 10-20 minutes of trial-and-error circuit identification using the "flip breaker and test" method. Current documentation solutions (Excel sheets, handwritten notes, physical labels) are fragmented, not visual, difficult to search, and lack any representation of circuit topology.

Map My Panel addresses this pain point by providing a desktop-first Electron application with a visual, interactive breaker panel interface backed by a local SQLite database. Users can progressively map their electrical system over time, building a persistent knowledge base that saves time, improves safety, and provides comprehensive documentation for professional electricians or home inspectors. The MVP focuses exclusively on Phase 1 features: visual panel configuration, entity management, and breaker-to-entity mapping, establishing the foundation for future circuit topology and mobile companion features.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-26 | 1.0 | Initial PRD draft based on Project Brief | John (PM) |
| 2026-06-26 | 1.1 | Added Epic Registry; recorded Epics 1–3 (Tags, History, MCP Ingest) as delivered; teed up Epic 2.5 (panel-scoped history) and Epic 4 (Tasks) | John (PM) |

---

## Requirements

### Functional

**FR1:** The application shall allow users to create a new breaker panel configuration by specifying the total number of breaker positions (e.g., 12, 24, 40 circuits).

**FR2:** The application shall display a visual representation of the breaker panel as an interactive grid matching the user's configured layout.

**FR3:** Users shall be able to add individual breakers to the panel, specifying breaker properties including position number, breaker type (single-pole or double-pole), and amperage rating (15A, 20A, 30A, 40A, 50A, etc.).

**FR4:** Users shall be able to remove breakers from the panel configuration.

**FR5:** The visual panel representation shall use color coding or visual indicators to distinguish between mapped breakers (with assigned entities) and unmapped breakers (no entities assigned).

**FR6:** Users shall be able to click on any breaker in the visual panel to view all entities assigned to that breaker.

**FR7:** The application shall allow users to create electrical entities with the following properties: entity type (outlet, switch, light, appliance, HVAC, other), name/label, location description, and assigned breaker ID.

**FR8:** Users shall be able to mark an entity as "unknown breaker" if the circuit assignment has not yet been identified.

**FR9:** The application shall provide a database list/table view showing all created entities with columns for type, name, location, and assigned breaker.

**FR10:** Users shall be able to search entities by name, location, or assigned breaker number with results updating in real-time as they type.

**FR11:** Users shall be able to filter the entity list by entity type (e.g., show only outlets, show only switches).

**FR12:** Users shall be able to edit existing entities to update name, location, type, or assigned breaker.

**FR13:** Users shall be able to delete entities from the database with a confirmation prompt to prevent accidental deletion.

**FR14:** The application shall persist all panel configurations, breakers, and entities in a local SQLite database file stored with the application data.

**FR15:** All data shall persist between application sessions without requiring manual save actions from the user.

**FR16:** Users shall be able to clear/reset the entire panel configuration and entity database with a confirmation workflow requiring explicit user consent.

**FR17:** The application shall provide a way to mark breakers as "spare" or "unused" to indicate breaker positions that are not currently in use.

**FR18:** When viewing a breaker's assigned entities, the application shall display the total count of entities on that circuit.

**FR19:** The application shall prevent users from assigning a double-pole breaker to a single breaker position (it must occupy two adjacent positions).

**FR20:** The application shall support breaker numbering conventions for both single-pole (1, 2, 3...) and double-pole breakers (1-3, 2-4, etc.).

### Non Functional

**NFR1:** The application shall launch from click to usable interface in under 3 seconds on a modern desktop computer (≤5 years old).

**NFR2:** Entity search operations shall return results in under 500ms for databases containing up to 200 entities.

**NFR3:** All database CRUD operations (create, read, update, delete) shall complete in under 100ms for typical panel sizes (12-40 circuits, 50-200 entities).

**NFR4:** The user interface shall maintain 60 fps responsiveness during all animations and interactions.

**NFR5:** The application shall function completely offline with no internet connectivity required for any core functionality.

**NFR6:** The application shall run on macOS 10.13+ and Windows 10+ without requiring administrator privileges for normal operation.

**NFR7:** The SQLite database file shall be portable and movable between machines without corruption or data loss.

**NFR8:** The application bundle size shall be optimized to remain under 150MB for initial download/distribution.

**NFR9:** The user interface shall be responsive and usable at minimum window sizes of 1024x768 pixels.

**NFR10:** The application shall follow Electron security best practices including context isolation and disabled Node.js integration in renderer processes.

**NFR11:** Adding a new entity and assigning it to a breaker shall be completable in under 30 seconds from start to finish.

**NFR12:** The application shall provide clear error messages and validation feedback when users attempt invalid operations (e.g., assigning double-pole breaker to single position).

**NFR13:** The codebase shall use TypeScript for type safety and maintainability.

**NFR14:** All UI components shall use a consistent design system (shadcn/ui or similar) for visual coherence.

---

## User Interface Design Goals

### Overall UX Vision

Map My Panel prioritizes **clarity and utility over aesthetics**. The MVP should feel like a professional tool designed for efficiency rather than a consumer app focused on visual polish. The interface should make complex electrical panel data feel approachable and manageable through clear visual hierarchy, consistent interaction patterns, and progressive disclosure. Users should be able to accomplish common tasks (finding which breaker controls an outlet, adding a newly discovered entity) with minimal clicks and cognitive overhead.

The application should feel like a **digital representation of a physical breaker panel**, providing spatial and visual cues that map to the user's real-world panel. However, it should also embrace the advantages of digital tools (search, filtering, editing) that transcend physical limitations.

### Key Interaction Paradigms

**Primary Interaction Model: Panel-First Navigation**
- The visual breaker panel is the primary navigation interface
- Users click breakers to see associated entities
- Users can jump from panel view to entity detail and back seamlessly

**Secondary Interaction Model: Search-First Discovery**
- Power users can bypass visual navigation via search
- Type entity name/location → immediately see which breaker it's on
- Search results link back to visual panel highlighting the relevant breaker

**Data Entry Optimizations:**
- Inline editing where possible (click to edit entity names/descriptions)
- Keyboard shortcuts for common operations (Cmd/Ctrl+N for new entity)
- Tab-through form fields for rapid data entry
- Auto-focus on first input when creating entities

**Spatial Consistency:**
- Breaker panel layout persists in same position across sessions
- Entity list maintains sort order preferences
- Panels and lists should feel "anchored" not ephemeral

### Core Screens and Views

**1. Main Panel View (Primary Screen)**
- Visual breaker panel grid (largest screen element)
- Quick stats panel (total entities, mapped vs unmapped circuits)
- Quick search bar always visible
- Sidebar or modal for entity list (toggleable)

**2. Panel Configuration Screen**
- Wizard-style setup for new panels
- Configure panel size (number of positions)
- Set panel name/location (for future multi-panel support)
- One-time setup that can be edited later

**3. Breaker Detail Modal/Panel**
- Opens when clicking a breaker
- Shows all entities assigned to this breaker
- Allows adding new entity directly to this breaker
- Displays breaker properties (amperage, type, position)

**4. Entity List/Database View**
- Sortable table of all entities
- Filter by type, breaker, or unknown status
- Search bar with live filtering
- Inline edit or click-to-edit functionality

**5. Entity Create/Edit Form**
- Modal or slide-over panel
- Fields: Type (dropdown), Name (text), Location (text), Breaker (dropdown or unknown)
- Submit creates/updates and returns to previous view

**6. Settings/Preferences Screen**
- Edit panel configuration
- Clear/reset database (with warnings)
- Future: Import/export options
- About/version information

### Accessibility

**None** - MVP prioritizes functionality over accessibility compliance. Future iterations should consider WCAG AA standards, but this is explicitly out of scope for Phase 1 given the solo developer constraint and personal-use focus.

### Branding

**Utilitarian Design Aesthetic** - No formal branding required for MVP. The application should use neutral colors (grays, blues) with accent colors for status indicators:
- **Green/teal** for mapped breakers (entities assigned)
- **Gray/muted** for unmapped breakers (no entities)
- **Yellow/amber** for breakers marked as "spare/unused"
- **Red/orange** for potential issues (e.g., no entities found for a search)

Typography should be clean and readable (system fonts acceptable: SF Pro on macOS, Segoe UI on Windows, or a web-safe font like Inter or Roboto if bundled).

Visual breaker panel representation should be schematic/abstract rather than photorealistic - think grid of rectangular cards or buttons, not a literal 3D panel image.

### Target Device and Platforms

**Desktop-First: Cross-Platform (macOS, Windows)**
- Primary development/testing on macOS
- Windows compatibility required for MVP
- Electron enables single codebase for both platforms
- Minimum resolution: 1024x768 (optimized for 1440p and higher)

**Mobile: Out of Scope for MVP**
- Mobile PWA companion is Phase 2
- MVP does not need to be responsive for phone/tablet screen sizes
- Focus entirely on desktop experience

---

## Technical Assumptions

### Repository Structure: Monorepo

The project shall use a **single repository** containing the Electron desktop application. Future mobile PWA can be added as a subdirectory within the monorepo (e.g., `/desktop` and `/mobile`) when Phase 2 begins, enabling shared TypeScript types and data models between platforms.

**Rationale:** Monorepo simplifies initial development for solo developer, enables code sharing between desktop and future PWA, and makes dependency management straightforward. Avoids premature complexity of polyrepo for a small project.

### Service Architecture

**Standalone Desktop Application (Monolith)**
- Electron main process handles SQLite database operations and file system access
- Electron renderer process runs React-based UI
- No external backend services or APIs
- All business logic embedded in the desktop application
- SQLite database file stored in user's application data directory

**Rationale:** A monolithic architecture is appropriate for this offline-first, single-user application. There's no need for microservices or serverless functions when all operations are local. This minimizes complexity and ensures the app works entirely offline.

### Testing Requirements

**Unit Testing + Manual Testing Only**
- Unit tests for critical business logic (database operations, data models, validation)
- Unit tests for utility functions and data transformations
- Manual testing for UI/UX workflows
- No integration or end-to-end testing for MVP

**Testing Frameworks:**
- Vitest or Jest for unit testing
- React Testing Library for component tests (if time permits)

**Rationale:** Given the 4-6 week timeline and solo developer constraint, prioritize unit tests for data layer (where bugs are most costly) and rely on manual testing for UI interactions. E2E testing frameworks like Playwright add setup overhead that's not justified for MVP given Brendan will be the primary tester through daily use.

### Additional Technical Assumptions and Requests

**Frontend Framework:** React 18+ with TypeScript
- Familiar ecosystem, large community, excellent TypeScript support
- Hooks-based architecture for clean component logic
- Consider using Vite for fast development builds within Electron

**UI Component Library:** shadcn/ui or Radix UI primitives
- Accessible, unstyled components that can be customized
- Tree-shakeable for smaller bundle sizes
- Integrates well with Tailwind CSS

**Styling:** Tailwind CSS
- Utility-first CSS for rapid UI development
- Small bundle size with PurgeCSS
- Easy to create custom design tokens
- Avoids CSS-in-JS runtime overhead

**Electron Boilerplate:** electron-vite or electron-forge
- Modern Electron setup with hot reload during development
- Built-in TypeScript support
- Streamlined build/package process
- Security best practices baked in

**Database Layer:** better-sqlite3
- Synchronous SQLite API (simpler than async for Electron main process)
- Excellent performance for read-heavy workloads
- Easy to integrate with TypeScript
- Includes migration support for schema evolution

**State Management:** Zustand or React Context + useReducer
- Lightweight state management (avoid Redux overhead for small app)
- TypeScript-first API
- Simple to reason about for solo developer

**Build & Distribution:**
- GitHub for version control
- GitHub Actions for automated builds (future)
- Direct download distribution via GitHub Releases (no app stores)
- Code signing deferred to post-MVP (users will see OS warnings)

**Development Environment:**
- Node.js 20+ LTS
- pnpm for package management (faster than npm/yarn)
- ESLint + Prettier for code quality
- Git pre-commit hooks with Husky (optional, if time permits)

**Data Model Extensibility:**
- Design SQLite schema with future Phase 2 features in mind
- Include `metadata` JSON column on entities for flexible future fields
- Version schema to enable migrations as features evolve

**Error Handling:**
- Graceful degradation for corrupted database files
- User-friendly error messages (not stack traces)
- Logging to file for debugging (user's app data directory)

**Performance:**
- Virtualize long lists (entity list with 100+ items) using react-window or similar
- Index SQLite database columns used in searches (entity name, location, breaker_id)
- Debounce search input to avoid excessive re-renders

---

## Epic List

The MVP will be delivered through **three sequential epics**, each building on the previous to deliver increasingly valuable functionality:

### Epic 1: Foundation & Core Infrastructure
**Goal:** Establish the Electron application foundation with SQLite database, core data models, and basic application shell. Deliver a working app that can launch, create a database, and display a minimal UI, proving the technical stack is functional.

### Epic 2: Visual Breaker Panel Interface
**Goal:** Implement the customizable visual breaker panel GUI that allows users to configure panel layout, add/remove breakers, and interact with the visual representation. Users can create and visualize their breaker panel but not yet add entities.

### Epic 3: Entity Management System
**Goal:** Build the complete entity CRUD system with search, filtering, and breaker assignment capabilities. Users can now fully map their electrical systems by creating entities and assigning them to breakers, achieving the core MVP value proposition.

---

## Epic 1: Foundation & Core Infrastructure

**Epic Goal:** Establish the foundational Electron application with SQLite database integration, core TypeScript data models, and basic application shell. This epic delivers a working application that can launch, initialize a database, and display a minimal UI, validating the technical stack and enabling all subsequent feature development.

### Story 1.1: Electron Application Scaffold

As a **developer**,
I want **a working Electron application with TypeScript, React, and Vite configured**,
so that **I have a solid foundation to build features on**.

#### Acceptance Criteria

1. Electron application launches successfully on macOS and Windows
2. React 18+ renders a basic "Hello World" component in the renderer process
3. TypeScript compilation works without errors for both main and renderer processes
4. Vite provides hot-reload during development (changes reflect without full restart)
5. Project includes package.json with all necessary dependencies
6. ESLint and Prettier are configured and passing
7. Git repository is initialized with appropriate .gitignore
8. README includes instructions for installing dependencies and running in dev mode

### Story 1.2: SQLite Database Setup and Core Schema

As a **developer**,
I want **a SQLite database with core schema for panels, breakers, and entities**,
so that **the application can persist data locally**.

#### Acceptance Criteria

1. better-sqlite3 is integrated into the Electron main process
2. Database file is created in the user's application data directory on first launch
3. Core schema includes tables: `panels`, `breakers`, `entities`
4. `panels` table includes: id, name, total_positions, created_at, updated_at
5. `breakers` table includes: id, panel_id, position, breaker_type (single/double), amperage, status (active/spare/unused), created_at, updated_at
6. `entities` table includes: id, panel_id, breaker_id (nullable for unknown), entity_type, name, location, metadata (JSON), created_at, updated_at
7. Appropriate indexes are created on frequently queried columns (breaker_id, entity_type, name)
8. Database connection is established on app launch and closed on app quit
9. Basic error handling prevents app crash if database is corrupted (log error, show user message)
10. A simple migration system is in place for future schema changes

### Story 1.3: TypeScript Data Models and Repository Pattern

As a **developer**,
I want **TypeScript interfaces and repository classes for database operations**,
so that **I have type-safe, testable data access throughout the application**.

#### Acceptance Criteria

1. TypeScript interfaces defined for Panel, Breaker, Entity domain models
2. Repository classes created: PanelRepository, BreakerRepository, EntityRepository
3. Each repository implements CRUD methods: create(), findById(), findAll(), update(), delete()
4. All repository methods return properly typed results
5. Repository methods handle database errors gracefully with meaningful error messages
6. EntityRepository includes search() method accepting name, location, or breaker_id filters
7. Unit tests cover repository methods with in-memory SQLite database
8. Main process exposes IPC handlers for renderer to call repository methods
9. Renderer process includes typed IPC wrapper functions for calling database operations

### Story 1.4: Basic Application Shell with Navigation

As a **user**,
I want **a basic application shell with navigation to future feature areas**,
so that **I can launch the app and see the foundation for the panel and entity management features**.

#### Acceptance Criteria

1. Application window opens at a reasonable default size (1200x800 minimum)
2. Application includes a header/title bar showing "Map My Panel"
3. Navigation structure includes placeholders for: Panel View, Entity List, Settings
4. Clicking navigation items changes the displayed content area (even if placeholder content)
5. Application uses shadcn/ui or Radix UI components for navigation elements
6. Tailwind CSS is configured and styling is applied consistently
7. Application includes a basic color scheme (neutral grays with accent colors defined in Tailwind config)
8. Window state (size, position) is persisted between sessions
9. Application includes a footer showing version number
10. Basic keyboard shortcuts work (Cmd/Ctrl+Q to quit)

---

## Epic 2: Visual Breaker Panel Interface

**Epic Goal:** Implement the customizable visual breaker panel GUI that allows users to configure their panel layout, add/remove breakers with properties (type, amperage), and interact with a visual grid representation. Users can now create a digital twin of their physical breaker panel, seeing mapped vs unmapped circuits at a glance.

### Story 2.1: Panel Configuration Wizard

As a **user**,
I want **a setup wizard that guides me through creating my first panel**,
so that **I can quickly configure a panel matching my physical breaker box**.

#### Acceptance Criteria

1. On first launch (no panels in database), wizard automatically appears
2. Wizard includes step: "Name your panel" with text input (default: "Main Panel")
3. Wizard includes step: "How many breaker positions?" with common options (12, 24, 40) and custom number input
4. Wizard includes confirmation step showing summary: "You're creating a panel called [name] with [X] positions"
5. Clicking "Create Panel" inserts panel record in database and transitions to Panel View
6. Wizard can be accessed later via Settings to create additional panels (for future multi-panel support)
7. Form validation ensures panel name is not empty and position count is between 1-100
8. Wizard can be cancelled, returning user to empty state with option to start wizard again
9. Wizard uses shadcn/ui form components for consistent styling

### Story 2.2: Visual Panel Grid Display

As a **user**,
I want **to see a visual grid representation of my breaker panel**,
so that **I can view my panel layout at a glance and identify breakers spatially**.

#### Acceptance Criteria

1. Panel View displays breakers as a grid matching the configured panel size
2. Grid arranges breakers in two columns (odd numbers left, even numbers right) to match standard panel layouts
3. Each breaker position is represented as a rectangular card/button showing position number
4. Empty positions (no breaker configured) are shown as grayed-out placeholders
5. Configured breakers display position number and amperage rating (e.g., "15 - 20A")
6. Grid is scrollable if panel size exceeds viewport height
7. Grid layout is responsive to window resizing while maintaining aspect ratio
8. Panel name is displayed prominently above the grid
9. Quick stats are shown: "X of Y breakers configured"

### Story 2.3: Add Breaker to Panel

As a **user**,
I want **to add a breaker to an empty position in my panel**,
so that **I can build out my panel configuration to match my physical setup**.

#### Acceptance Criteria

1. Clicking an empty position opens "Add Breaker" modal/form
2. Form includes fields: Breaker Type (single-pole or double-pole), Amperage (dropdown: 15, 20, 30, 40, 50, custom)
3. Form pre-selects single-pole and 20A as defaults
4. Clicking "Add Breaker" creates breaker record and updates visual panel immediately
5. Double-pole breakers automatically occupy two adjacent positions and display as a single tall card spanning both
6. Form validation prevents adding double-pole breaker if adjacent position is occupied
7. Form validation prevents adding breaker to already-occupied position
8. Success feedback is shown (visual confirmation, panel updates)
9. Modal can be cancelled without creating breaker
10. Keyboard shortcut (Cmd/Ctrl+B) opens Add Breaker modal for selected position

### Story 2.4: Edit and Remove Breakers

As a **user**,
I want **to edit or remove breakers from my panel**,
so that **I can correct mistakes or update my configuration as my electrical system changes**.

#### Acceptance Criteria

1. Right-clicking or long-pressing a configured breaker shows context menu with "Edit" and "Remove" options
2. Clicking "Edit" opens modal pre-populated with current breaker properties
3. User can change breaker type or amperage and save changes
4. Changes are persisted to database and visual panel updates immediately
5. Clicking "Remove" shows confirmation dialog: "Are you sure you want to remove breaker X?"
6. Confirming removal deletes breaker record and returns position to empty state
7. If removing a breaker that has entities assigned, warning message appears: "This breaker has X entities assigned. Remove anyway?"
8. Removing a breaker with entities sets those entities' breaker_id to null (unknown status)
9. Visual panel reflects removal immediately (position becomes empty placeholder)

### Story 2.5: Breaker Status Indicators and Visual Feedback

As a **user**,
I want **visual indicators showing which breakers have entities assigned and which are unmapped**,
so that **I can quickly see my mapping progress and identify circuits that need documentation**.

#### Acceptance Criteria

1. Breakers with one or more entities assigned display in green/teal color
2. Breakers with no entities assigned (unmapped) display in gray/muted color
3. Breakers marked as "spare/unused" display in yellow/amber color
4. Hovering over a breaker shows tooltip with count: "X entities" or "No entities"
5. Clicking a breaker with entities transitions to Breaker Detail view (modal or panel)
6. Clicking an unmapped breaker shows option: "Add Entity to this Breaker"
7. Quick stats update automatically: "X of Y breakers mapped"
8. Visual feedback (subtle pulse or glow) when breaker is updated
9. Color scheme uses sufficient contrast for readability
10. Status indicator legend is displayed on screen ("Green = mapped, Gray = unmapped, Amber = spare")

---

## Epic 3: Entity Management System

**Epic Goal:** Build the complete entity CRUD system enabling users to create electrical entities (outlets, switches, lights), assign them to breakers, search and filter the entity database, and edit or remove entities. This epic delivers the core MVP value proposition: a searchable, visual system for mapping home electrical circuits.

### Story 3.1: Create Entity with Breaker Assignment

As a **user**,
I want **to create a new electrical entity and assign it to a specific breaker**,
so that **I can document what's on each circuit as I discover it during electrical work**.

#### Acceptance Criteria

1. "Add Entity" button is prominently displayed in the UI (header or floating action button)
2. Clicking "Add Entity" opens a modal/form with fields: Type (dropdown), Name (text), Location (text), Breaker (dropdown)
3. Type dropdown includes options: Outlet, Switch, Light, Appliance, HVAC, Other
4. Name field has placeholder: "e.g., Bedroom Outlet 1"
5. Location field has placeholder: "e.g., Master bedroom, north wall by window"
6. Breaker dropdown lists all configured breakers by position number and amperage
7. Breaker dropdown includes "Unknown" option for entities not yet mapped to a breaker
8. Form validation requires Type and Name (Location and Breaker are optional)
9. Clicking "Save" creates entity record in database and closes modal
10. User receives confirmation feedback and entity appears in entity list immediately
11. If breaker was selected, visual panel updates to show breaker as "mapped" (green)
12. Keyboard shortcut (Cmd/Ctrl+N) opens "Add Entity" modal
13. Form fields support Tab navigation for rapid data entry

### Story 3.2: Entity List View with Search and Filter

As a **user**,
I want **to view all my entities in a searchable, filterable list**,
so that **I can quickly find which breaker controls any entity in my home**.

#### Acceptance Criteria

1. Entity List view displays all entities in a table with columns: Type, Name, Location, Breaker
2. Table is sortable by clicking column headers (ascending/descending)
3. Search bar is prominently displayed above the table
4. Typing in search bar filters entities in real-time by Name or Location (case-insensitive)
5. Search results update in under 500ms as user types
6. Filter dropdown allows filtering by Type (show only Outlets, show only Switches, etc.)
7. Filter dropdown includes "Unknown Breaker" option to show all unmapped entities
8. Filters and search work together (e.g., search "bedroom" + filter "Outlet" shows only bedroom outlets)
9. Entity count is displayed: "Showing X of Y entities"
10. Clicking "Clear" button resets search and filters
11. Empty state message when no entities exist: "No entities yet. Click 'Add Entity' to get started."
12. Empty state message when search/filter returns no results: "No entities match your search."
13. Table is virtualized for performance with 100+ entities

### Story 3.3: Breaker Detail View with Assigned Entities

As a **user**,
I want **to click a breaker and see all entities assigned to it**,
so that **I know exactly what's on that circuit when planning electrical work**.

#### Acceptance Criteria

1. Clicking a breaker in the visual panel opens Breaker Detail modal/panel
2. Modal header shows breaker position, type, and amperage: "Breaker 15 - Single Pole - 20A"
3. Modal displays list of all entities assigned to this breaker
4. Each entity in the list shows: Type icon, Name, Location
5. Entity count is shown: "X entities on this circuit"
6. If breaker has no entities, message displays: "No entities assigned yet."
7. "Add Entity to this Breaker" button opens entity creation form with breaker pre-selected
8. Clicking an entity in the list navigates to entity edit form
9. Modal can be closed with X button, Escape key, or clicking outside modal
10. Breaker status (spare/unused) can be toggled from this view

### Story 3.4: Edit and Delete Entities

As a **user**,
I want **to edit or delete entities**,
so that **I can correct mistakes or update information as I learn more about my electrical system**.

#### Acceptance Criteria

1. Clicking an entity row in entity list opens Edit Entity modal
2. Edit modal is pre-populated with current entity values
3. User can change any field (Type, Name, Location, Breaker assignment)
4. Clicking "Save" updates entity record and refreshes list immediately
5. Clicking "Delete" button in edit modal shows confirmation: "Are you sure you want to delete [entity name]?"
6. Confirming deletion removes entity from database and updates UI
7. If entity was last one assigned to a breaker, that breaker's status updates to "unmapped" (gray)
8. Edit modal can be cancelled without saving changes
9. Form validation prevents saving entity with empty Name
10. Keyboard shortcut (Cmd/Ctrl+S) saves changes, Escape cancels

### Story 3.5: Clear/Reset Panel Configuration

As a **user**,
I want **to clear my entire panel configuration and start fresh if needed**,
so that **I can experiment with the app or completely redo my configuration without manually deleting everything**.

#### Acceptance Criteria

1. Settings screen includes "Reset Panel" section with clear warning message
2. "Reset Panel" button is visually distinct (red/destructive styling)
3. Clicking "Reset Panel" opens multi-step confirmation workflow
4. Step 1: "This will delete all breakers and entities. Are you sure?"
5. Step 2: Type "DELETE" to confirm (prevents accidental clicks)
6. After confirmation, all breakers and entities are deleted from database
7. User is returned to empty state with panel configuration wizard
8. Success message confirms reset: "Panel reset complete. You can now create a new panel."
9. Reset operation completes in under 1 second for typical panel sizes
10. Database integrity is maintained after reset (no orphaned records)

---

## Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 94% ✅

**MVP Scope Appropriateness:** Just Right - The scope is appropriately minimal while remaining viable for validating the core value proposition.

**Readiness for Architecture Phase:** ✅ **READY** - The PRD provides sufficient detail and clarity for the architect to begin detailed system design.

**Most Critical Strengths:**
- Clear problem definition with quantified user pain points
- Well-defined functional and non-functional requirements (20 FRs, 14 NFRs)
- Excellent epic/story structure with testable acceptance criteria
- Strong technical guidance with rationale for all major decisions
- Realistic timeline and scope for solo developer MVP

**Areas for Minor Improvement:**
- User flow diagrams could be added (though stories are sufficiently clear)
- Operational monitoring/support could be more detailed (acceptable for personal MVP)

---

### Category Analysis

| Category                         | Status  | Critical Issues | Notes |
| -------------------------------- | ------- | --------------- | ----- |
| 1. Problem Definition & Context  | ✅ PASS | None | Clear problem statement, target users, success metrics, and competitive landscape |
| 2. MVP Scope Definition          | ✅ PASS | None | Excellent separation of Phase 1 MVP vs Phase 2, clear out-of-scope items |
| 3. User Experience Requirements  | ✅ PASS | None | Core screens defined, accessibility decision documented, performance targets clear |
| 4. Functional Requirements       | ✅ PASS | None | 20 functional requirements covering all MVP features, testable and unambiguous |
| 5. Non-Functional Requirements   | ✅ PASS | None | 14 NFRs covering performance, security, reliability, and platform requirements |
| 6. Epic & Story Structure        | ✅ PASS | None | 3 epics with 14 stories, each with comprehensive acceptance criteria (5-13 AC per story) |
| 7. Technical Guidance            | ✅ PASS | None | Complete tech stack specified with rationale, architecture direction clear |
| 8. Cross-Functional Requirements | ✅ PASS | None | Data model defined, no external integrations (offline-first) |
| 9. Clarity & Communication       | ✅ PASS | None | Well-structured, consistent terminology, appropriate technical level |

**Overall Assessment:** All 9 categories PASS - No blockers or critical issues identified.

---

### Top Issues by Priority

#### BLOCKERS
*None identified* ✅

#### HIGH Priority
*None identified* ✅

#### MEDIUM Priority
1. **User Flow Diagrams** - Adding visual flow diagrams for primary user journeys (panel setup, entity creation, search) would help UX designer, but stories provide sufficient detail for implementation.
2. **Monitoring/Observability** - Limited operational monitoring beyond file logging. Acceptable for personal MVP but would need expansion for production/multi-user scenarios.

#### LOW Priority
1. **Technical Debt Strategy** - No explicit technical debt management approach documented. Acceptable for MVP but should be considered for post-MVP iterations.
2. **Data Quality Validation Rules** - Validation is mentioned but comprehensive data quality rules could be more detailed. Current validation in acceptance criteria is sufficient.

---

### MVP Scope Assessment

**Scope Appropriateness:** ✅ **Just Right**

**Analysis:**
- **Core Features Included:** Visual panel configuration, entity CRUD, breaker-to-entity mapping, search/filter
- **Complexity Level:** Appropriate for 4-6 week solo development timeline
- **Value Delivery:** MVP directly addresses primary pain point (identifying which breaker controls what)
- **Foundation for Growth:** Epic 1 establishes solid foundation for Phase 2 features

**Features Correctly Deferred to Phase 2:**
- Circuit topology/flow mapping (adds complexity without core value)
- Mobile PWA companion (desktop-first is correct for primary use case)
- Multi-panel support (single panel sufficient for validation)
- Export to PDF (nice-to-have, not core value)
- Photo attachments (adds storage complexity)

**No Missing Essential Features Identified** - MVP scope covers all must-haves for core value proposition.

**Timeline Realism:** 4-6 weeks for 3 epics (14 stories) is achievable for experienced solo developer with part-time hours. Stories are appropriately sized for 2-4 hour execution blocks.

---

### Technical Readiness

**Clarity of Technical Constraints:** ✅ Excellent
- Offline-first architecture clearly specified
- Electron + React + TypeScript + SQLite stack fully defined
- Platform requirements (macOS 10.13+, Windows 10+) explicit
- Performance targets quantified (3s launch, 500ms search, 100ms CRUD, 60fps UI)

**Identified Technical Risks:**
1. **Electron bundle size** - Acknowledged in brief (100MB+ overhead), mitigation is optimization to <150MB
2. **Visual panel UI complexity** - Flagged in brief, mitigation is starting with simple grid layout
3. **Double-pole breaker representation** - Addressed in FR19-20 and Story 2.3 AC5-7

**Areas Needing Architect Investigation:**
1. **SQLite schema design for future extensibility** - Story 1.2 includes migration system, architect should design schema with Phase 2 topology in mind
2. **Electron IPC patterns** - Story 1.3 addresses this but architect should define standard patterns
3. **React component architecture** - Architect should design reusable component hierarchy for breaker grid and entity list virtualization
4. **State management approach** - Zustand vs Context+useReducer decision deferred to architect

**Security Considerations:** Electron security best practices specified in NFR10, offline-only data (no transmission) simplifies security model.

---

### Recommendations

#### For Architect Phase
1. ✅ **Proceed with architecture design** - PRD provides sufficient clarity
2. Design SQLite schema with `metadata` JSON column for future extensibility (per Technical Assumptions)
3. Define Electron IPC communication patterns between main/renderer processes
4. Create component hierarchy for visual breaker panel grid (handle single-pole, double-pole, empty states)
5. Select state management approach (Zustand recommended for simplicity)
6. Plan for virtualization in entity list (react-window for 100+ entities)

#### For Implementation
1. Follow epic sequence strictly: Epic 1 (foundation) → Epic 2 (panel UI) → Epic 3 (entities)
2. Prioritize Story 1.3 (data models & repositories) - this is the critical foundation
3. Include unit tests from the start (Story 1.3 AC7) to catch data layer bugs early
4. Maintain focus on performance NFRs during development (especially NFR1-4)

#### For Post-MVP
1. Consider adding user flow diagrams to documentation
2. Evaluate need for enhanced monitoring/logging based on real usage
3. Collect feedback from friends/family users before starting Phase 2

---

### Final Decision

✅ **READY FOR ARCHITECT**

The PRD and epics are comprehensive, properly structured, and ready for architectural design. The document provides:
- Clear problem definition and success criteria
- Complete functional and non-functional requirements
- Well-sequenced epics with detailed, testable stories
- Sufficient technical guidance and constraints
- Realistic MVP scope for 4-6 week timeline

**Next Step:** Proceed to Architecture phase. Architect should review PRD and Project Brief, then create detailed system architecture covering Electron app structure, SQLite schema, component hierarchy, and implementation patterns.

---

*PM Checklist validation completed on 2025-10-26 by John (Product Manager)*

---

## Next Steps

### UX Expert Prompt

The Product Requirements Document for Map My Panel is now complete. Please review the PRD thoroughly, paying special attention to the User Interface Design Goals section which outlines the UX vision, interaction paradigms, and core screens. Your task is to:

1. Create detailed wireframes or mockups for the six core screens identified (Main Panel View, Panel Configuration, Breaker Detail, Entity List, Entity Create/Edit, Settings)
2. Design the visual breaker panel grid component with clear states for mapped/unmapped/spare breakers
3. Define the component hierarchy and interaction flows between screens
4. Provide design tokens (colors, spacing, typography) aligned with the "utilitarian design aesthetic"
5. Ensure designs support the performance requirements (launch in <3s, search in <500ms, add entity in <30s)

### Architect Prompt

The Product Requirements Document for Map My Panel is now complete. Please review the PRD thoroughly, paying special attention to the Technical Assumptions section which defines the tech stack and architectural decisions. Your task is to:

1. Design the detailed system architecture for the Electron desktop application including main process, renderer process, and IPC communication patterns
2. Define the complete SQLite database schema with migrations strategy
3. Specify the folder/file structure for the monorepo
4. Design the data flow from user interactions through React components to database operations
5. Identify reusable abstractions and component patterns
6. Ensure architecture supports all functional and non-functional requirements
7. Document build, test, and distribution workflows

Once the architecture is defined, we can begin story implementation starting with Epic 1.

---

*PRD created using BMAD-METHOD™ PM framework - Product Management & Requirements Engineering*
