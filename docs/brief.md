# Project Brief: Map My Panel

**Date:** 2025-10-26
**Author:** Brendan (with Mary - Business Analyst)
**Version:** 1.0

---

## Executive Summary

**Map My Panel** is a desktop-first application that enables DIY homeowners and small landlords to visually map, document, and manage their electrical breaker panels. The application replaces error-prone Excel spreadsheets and handwritten notes with an interactive visual interface that allows users to associate electrical entities (outlets, switches, lights) with specific breakers and track circuit flow topology over time. Built as an Electron app with SQLite for local storage and a companion mobile web helper, Map My Panel solves the ubiquitous problem of unlabeled or mislabeled breaker panels that plague homeowners during DIY electrical work and troubleshooting.

**Primary Problem:** Homeowners inherit undocumented breaker panels and waste time during electrical work figuring out which circuit powers which outlets/fixtures, currently tracking discoveries in fragmented manual systems.

**Target Market:** DIY homeowners performing electrical maintenance/upgrades, and small-scale landlords managing 1-5 properties.

**Key Value Proposition:** Transform circuit discovery from a frustrating trial-and-error process documented in spreadsheets into a visual, searchable, persistent knowledge base that grows with your understanding of your home's electrical system.

---

## Problem Statement

### Current State & Pain Points

When homeowners move into a new property or inherit an older home, the electrical breaker panel is frequently unlabeled, mislabeled, or documented with cryptic abbreviations that no longer match reality after years of renovations and modifications. This creates several cascading problems:

1. **Wasted Time During Electrical Work** - Every DIY electrical project (changing an outlet, installing a fixture, troubleshooting a dead circuit) requires first identifying which breaker controls that location, typically through trial-and-error testing.

2. **Fragmented Documentation** - Homeowners resort to Excel spreadsheets, handwritten notes taped to panels, or mental recall to track discoveries. These methods are:
   - Not visual or intuitive
   - Easy to lose or become outdated
   - Difficult to search when needed urgently
   - Impossible to share with family members or future owners
   - Lack any circuit topology information (what comes before/after on the circuit)

3. **Repeated Discovery** - Without proper documentation, the same circuits get rediscovered multiple times, especially when different family members do work or when months pass between projects.

4. **Safety Concerns** - Incorrect assumptions about circuit mapping can lead to working on live circuits or overloading circuits unknowingly.

### Impact

This problem affects virtually every homeowner who performs any DIY electrical work. The user (Brendan) currently manages this with an Excel sheet for his primary residence and duplex rental property, spending 10-15 minutes per electrical project just identifying circuits before work can begin. This compounds across hundreds of homeowners performing thousands of projects annually.

### Why Existing Solutions Fall Short

- **Physical labels on panels** - Limited space, get dirty/illegible, can't show circuit topology or detailed notes
- **Excel/Google Sheets** - Not visual, require opening files, no spatial/topological representation
- **General home maintenance apps** - Too broad, don't provide circuit-specific visualization or breaker panel interface
- **Professional electrical documentation software** - Overkill for homeowners, expensive, designed for electricians drawing schematics

### Urgency

This is a "scratch your own itch" MVP driven by immediate personal need. Brendan has accumulated sufficient data in his Excel sheet that maintaining it has become unwieldy, and he wants a better solution before performing more electrical work. The problem is persistent and evergreen - electrical panels don't go away, and DIY home improvement continues to grow in popularity.

---

## Proposed Solution

### Core Concept

**Map My Panel** is an offline-first Electron desktop application that provides:

1. **Visual Interactive Breaker Panel** - A customizable GUI representation of your actual breaker panel where you can add/remove breakers, configure panel layout (number of circuits, single vs. double pole breakers), and interact with individual breakers.

2. **Entity Database** - A local SQLite database storing electrical entities (outlets, switches, lights, appliances, HVAC components) with:
   - Association to specific breaker IDs
   - Descriptive names and locations ("Bedroom outlet 1 - corner by window")
   - Unknown/TBD status for entities not yet mapped
   - Custom metadata and notes

3. **Circuit Topology Mapping** - Track the sequence/flow of entities on each circuit, documenting what comes first, second, third in the electrical path (initially list-based, potentially drag-and-drop flowchart in future).

4. **Mobile Web Helper** - A read-only or limited-feature Progressive Web App accessible on phones for reference while walking around the house, displaying breaker assignments and circuit diagrams without full editing capabilities.

### Key Differentiators

- **Offline-first by design** - All data stored locally in SQLite, no cloud dependency, works in basements/attics without internet
- **Visual panel representation** - Not just a list, but an interactive spatial GUI matching your physical panel
- **Progressive disclosure** - Start simple (just breaker + entity mapping), layer in complexity (circuit topology) as you learn more
- **Purpose-built for homeowner workflow** - Designed around the "I'm replacing an outlet, which breaker is this?" use case, not professional electrical design

### Why This Will Succeed

1. **Solves a real, persistent problem** with no adequate existing solution for homeowners
2. **User (Brendan) is the target customer** - building for own need ensures product-market fit for at least one person
3. **MVP scope is achievable** - Core features are straightforward CRUD operations with a visual interface layer
4. **Offline-first removes friction** - No account creation, no cloud sync complexity, works immediately
5. **Shareable but not social** - Can be useful to friends/family without needing to build community/sharing features

### High-Level Vision

A homeowner downloads Map My Panel, configures their panel layout in 2 minutes, then over the course of months/years progressively fills in circuit mappings as they do electrical work. Eventually they have a comprehensive, visual, searchable documentation of their entire electrical system that can be exported and handed to electricians, home inspectors, or future buyers.

---

## Target Users

### Primary User Segment: DIY Homeowners

**Profile:**
- Homeowners who perform their own electrical maintenance/upgrades (changing outlets, installing fixtures, adding circuits)
- Technical comfort: Comfortable using desktop software, understands basic electrical concepts (breaker, circuit, outlet)
- Age: 28-55, typically male but not exclusively
- Own 1-2 properties (primary residence + maybe vacation home)
- Have experienced the breaker panel labeling problem firsthand

**Current Behaviors:**
- Use trial-and-error "flip breaker and test" method to identify circuits
- Document findings in Excel, Google Sheets, Notes apps, or handwritten
- Perform 2-10 electrical projects per year requiring circuit identification
- May have started mapping their panel but abandoned it due to tool limitations

**Pain Points:**
- Wasting 10-20 minutes per project just identifying circuits
- Forgetting previous discoveries and re-testing circuits
- Inability to visualize circuit topology when planning electrical work
- Fear of working on wrong circuit due to poor documentation

**Goals:**
- Save time during electrical projects
- Build a permanent knowledge base about home electrical system
- Ensure safety by knowing exactly what's on each circuit
- Eventually have complete documentation for resale/inspector purposes

### Secondary User Segment: Small Landlords

**Profile:**
- Landlords managing 1-5 rental properties
- Responsible for electrical maintenance/troubleshooting across multiple buildings
- May hire electricians but want to document systems for their own reference
- Need to track which circuits power which units in multi-family buildings

**Pain Points:**
- Managing multiple panels across different properties
- Losing track of circuit mappings when time passes between visits to properties
- Difficulty directing tenants or electricians to specific circuits remotely
- Inconsistent documentation across properties

**Goals:**
- Consistent documentation system across all properties
- Quick reference when tenants report electrical issues
- Ability to share circuit information with electricians without being on-site
- Reduce time spent on-site troubleshooting electrical problems

---

## Goals & Success Metrics

### Business Objectives

- **Personal utility achieved** - Brendan successfully uses Map My Panel to manage his primary residence and duplex rental panel mappings, eliminating his Excel spreadsheet within 30 days of MVP launch
- **Shareability validated** - At least 2 friends/family members successfully use the application for their own homes within 90 days
- **MVP completion timeline** - Functional MVP (Phase 1 features) completed and in use within 4-6 weeks of starting development

### User Success Metrics

- **Time saved per electrical project** - Reduce circuit identification time from 10-15 minutes to under 2 minutes (searching the app)
- **Documentation completeness** - User has mapped at least 80% of circuits within 6 months of starting to use the app
- **Reference frequency** - User opens app at least once per month for electrical work or reference
- **Data persistence** - User continues to update and maintain panel mapping over 12+ months (not abandoned)

### Key Performance Indicators (KPIs)

- **Entities per panel**: Target average 30-50 entities mapped (outlets, switches, lights) per household
- **App launch time**: Under 3 seconds from click to usable interface
- **Circuit identification searches**: Under 5 seconds to find which breaker powers a specific entity
- **Data entry speed**: Add new entity and assign to breaker in under 30 seconds
- **Export/share success**: Ability to export panel documentation to PDF or shareable format for electricians/inspectors

---

## MVP Scope

### Core Features (Must Have)

**Phase 1 - Visual Panel + Entity Management:**

- **Customizable Visual Breaker Panel GUI**
  - Add/remove individual breakers to match user's actual panel
  - Configure breaker properties (single pole, double pole, amperage)
  - Visual representation using CSS/styled components
  - Click on breaker to view associated entities
  - Color coding or indicators for mapped vs. unmapped breakers

- **Entity Management System**
  - Create entities (outlets, switches, lights, appliances, other)
  - Assign entity to specific breaker ID
  - Mark entity as "unknown breaker" if not yet identified
  - Add descriptive name and location details
  - Search/filter entities by name, location, or breaker
  - View all entities in database list/table format

- **Local Data Persistence**
  - SQLite database stored locally with application
  - Data persists between app sessions
  - No cloud sync or account required

- **Basic Data Management**
  - Edit existing entities and breaker assignments
  - Delete entities or breakers
  - Clear/reset panel configuration

**Rationale:** Phase 1 provides immediate value by replacing the Excel sheet with a visual, searchable system. This addresses the primary pain point (identifying which breaker controls what) and establishes the data model for future enhancements.

### Out of Scope for MVP

- Circuit topology/flow mapping (deferred to Phase 2)
- Mobile app with full editing capabilities (read-only helper only)
- Multi-panel support (multiple properties)
- Cloud sync or backup
- Export to PDF/print functionality
- Photo attachments for entities or breakers
- Load calculation or code compliance checking
- Undo/redo functionality
- Collaboration/sharing with other users in real-time
- Import from Excel/CSV
- Advanced search with boolean operators

### MVP Success Criteria

**The MVP is successful when:**

1. Brendan can configure a visual representation matching his actual 24-circuit breaker panel in under 5 minutes
2. All 40+ entities currently in his Excel sheet are migrated to the app and assigned to correct breakers
3. During the next electrical project, Brendan successfully identifies the relevant breaker using the app in under 2 minutes without referring to Excel
4. The application launches and operates fully offline with no internet dependency
5. Data persists correctly across app restarts with no corruption or loss
6. At least one friend successfully sets up and uses the app for their own panel within 2 weeks of receiving it

---

## Post-MVP Vision

### Phase 2 Features

**Circuit Topology Mapping (List-Based):**
- Define sequence order for entities on each circuit
- List view showing "Entity A → Entity B → Entity C" flow
- Mark entities as "first on circuit," "middle," "last," or "unknown position"
- Add notes about wire tracing observations ("traced through attic," "behind drywall")

**Enhanced Mobile Web Helper:**
- Progressive Web App accessible on phones
- Read-only views of panel configuration and entity assignments
- Quick search by room or entity name
- Snapshot/sync mechanism to push current desktop data to mobile helper

**Multi-Panel Support:**
- Manage multiple breaker panels (main panel + sub-panels)
- Tag panels by property or location
- Switch between panel views

### Long-Term Vision (12-24 Months)

**Advanced Circuit Visualization:**
- Drag-and-drop flowchart editor for circuit topology
- Visual diagram showing electrical path through entities
- Support for complex topologies (branches, multi-wire circuits)

**Professional Features:**
- Export panel documentation to PDF for electricians/inspectors
- Photo attachments for entities (document outlet locations, panel photos)
- Load calculation helper (estimate amp draw per circuit)
- Code compliance checker (warn if too many outlets on 15A circuit)

**Data Portability:**
- Import from Excel/CSV
- Export to standardized formats
- Backup/restore functionality

**Platform Expansion:**
- Native mobile apps (iOS/Android) with full editing
- Cloud sync option (optional, not required)
- Share panel configuration with electricians or family members

### Expansion Opportunities

- **B2B for small electrical contractors** - Tool for documenting customer panels during service calls
- **Integration with home automation** - Link to smart home devices to auto-map smart outlets/switches
- **Community templates** - Share common breaker panel layouts by manufacturer/model
- **Educational content** - Built-in guides for safe DIY electrical work and code requirements
- **Property management integration** - Connect to broader landlord/property management software

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Desktop-first (macOS, Windows)
  - Electron app for cross-platform desktop deployment
  - Secondary: Progressive Web App for mobile read-only access

- **Browser/OS Support:**
  - Desktop: macOS 10.13+, Windows 10+
  - Mobile PWA: iOS Safari 12+, Android Chrome 80+
  - No IE11 support required

- **Performance Requirements:**
  - App launch time: Under 3 seconds cold start
  - Entity search response: Under 500ms for 100+ entities
  - Database operations: Under 100ms for CRUD operations
  - UI responsiveness: 60fps animations and interactions

### Technology Preferences

- **Frontend:**
  - Electron for desktop shell
  - React or similar modern framework for UI components
  - CSS-in-JS or Tailwind for visual breaker panel styling
  - Consider: shadcn/ui or similar component library for consistent UI

- **Backend:**
  - Node.js (embedded in Electron)
  - SQLite for local database (via better-sqlite3 or similar)
  - No external backend server required

- **Database:**
  - SQLite (file-based, local storage)
  - Schema: Tables for panels, breakers, entities, circuit_topology
  - Consider: Migrations system for future schema updates

- **Hosting/Infrastructure:**
  - None required for MVP (desktop app only)
  - For mobile PWA: Simple static hosting (GitHub Pages, Vercel, Netlify)
  - Distribution: Direct download from GitHub releases or personal site (no app stores initially)

### Architecture Considerations

- **Repository Structure:**
  - Monorepo or single repo for desktop + PWA
  - Electron main process + renderer process separation
  - Shared data models/types between desktop and PWA

- **Service Architecture:**
  - Desktop: Standalone Electron app with embedded SQLite
  - PWA: Static files + read-only data export mechanism
  - Data sync: Manual export from desktop → import to PWA (not real-time)

- **Integration Requirements:**
  - No third-party integrations required for MVP
  - Future: Consider file system APIs for backup/restore
  - Future: Consider image handling for photos of panels/entities

- **Security/Compliance:**
  - Local-only data, no transmission to servers
  - No user authentication required (single-user desktop app)
  - Consider: Optional password protection for app launch (future)
  - No PII collected or transmitted
  - Standard Electron security best practices (context isolation, etc.)

---

## Constraints & Assumptions

### Constraints

- **Budget:** $0 - personal project using free/open-source tools only
  - No paid services, APIs, or infrastructure costs
  - No designer or contractor budget

- **Timeline:** ASAP target (4-6 weeks for Phase 1 MVP)
  - Solo developer (Brendan)
  - Part-time development hours (evenings/weekends)
  - Prioritize speed to working MVP over polish

- **Resources:**
  - Solo developer with full-stack web development skills
  - No dedicated QA, design, or PM resources
  - Testing limited to Brendan's own use cases

- **Technical:**
  - Must work completely offline (no internet dependency)
  - Must run on Brendan's Mac (primary) and Windows machines
  - Database must be file-based and portable (SQLite)
  - No mobile app stores (avoid app review processes for MVP)

### Key Assumptions

- Users have basic understanding of electrical concepts (breaker, circuit, outlet, switch)
- Users will tolerate a utilitarian UI in exchange for functionality (MVP doesn't need to be beautiful)
- Majority of use happens on desktop during planning phase, not on mobile while actively doing electrical work
- Users discover circuit mappings gradually over time through electrical projects, not all at once
- SQLite performance is sufficient for typical household panel sizes (12-40 circuits, 50-200 entities)
- Electron app distribution via direct download is acceptable (no need for app store presence)
- Local-only data storage is preferred over cloud sync for privacy and simplicity

---

## Risks & Open Questions

### Key Risks

- **Electron app size/overhead:** Electron apps can be 100MB+ even for simple functionality. May be overkill for this use case, but cross-platform desktop requirement justifies the trade-off.

- **UI/UX complexity for visual panel:** Creating an intuitive, customizable visual breaker panel representation could be more complex than anticipated. Mitigation: Start with simple grid layout, defer advanced customization to post-MVP.

- **Data model evolution:** As features like circuit topology are added, database schema may need significant changes. Mitigation: Design initial schema with extensibility in mind, plan migration strategy early.

- **Mobile PWA limitations:** Read-only PWA may not provide enough value to justify building it for MVP. Mitigation: Deprioritize mobile PWA to Phase 2 if needed.

- **Adoption beyond Brendan:** If no one else finds it useful, may not justify continued development. Mitigation: This is acceptable - primary goal is solving Brendan's own problem.

### Open Questions

- Should the visual breaker panel be a literal visual representation (looks like a real panel) or more abstract/schematic?
- How do users configure their panel layout initially? Wizard-style onboarding or manual configuration?
- What entity types should be supported beyond outlets, switches, lights? (HVAC, appliances, hardwired devices?)
- Should circuit topology be directional (A powers B) or just sequential (A then B on same circuit)?
- How should double-pole breakers (240V) be represented vs. single-pole?
- Should there be a way to mark breakers as "spare" or "unused"?
- What's the export format for sharing with electricians? PDF? JSON? Printable diagram?

### Areas Needing Further Research

- **Electron best practices 2025** - Review latest Electron security and performance patterns
- **SQLite schema design for electrical topology** - Research graph database patterns in SQLite for circuit flow
- **Visual breaker panel UI patterns** - Look for examples of customizable grid/panel builders in web apps
- **PWA offline data patterns** - Understand best practices for syncing desktop data to mobile PWA
- **Electrical code references** - Basic research into NEC requirements for future code compliance features
- **Existing tools review** - Quick survey of any competing/similar tools that may have emerged recently

---

## Appendices

### C. References

- Initial concept: User's Excel sheet for panel mapping (current state documentation)
- BMAD core configuration: `/Users/broman/Documents/Programming/map-my-panel/.bmad-core/core-config.yaml`
- This conversation: Transcript of analyst session defining project scope and requirements

---

## Next Steps

### Immediate Actions

1. **Review and refine this Project Brief** - Brendan reviews, provides feedback on any mischaracterizations or missing considerations
2. **Create Product Requirements Document (PRD)** - Hand off to PM agent/persona to develop detailed functional and technical requirements based on this brief
3. **Set up development environment** - Initialize git repo, Electron boilerplate, configure SQLite, set up build tooling
4. **Design initial database schema** - Define tables for panels, breakers, entities with extensibility for future circuit topology
5. **Create wireframes/mockups** - Sketch basic UI for visual breaker panel and entity management screens
6. **Begin Phase 1 development** - Start with core data layer and basic UI scaffolding

### PM Handoff

This Project Brief provides the full context for **Map My Panel**. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

---

*Document created using BMAD-METHOD™ analyst framework - Business Analysis & Strategic Ideation*
