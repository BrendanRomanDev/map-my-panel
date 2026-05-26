# Feature Requests

This document tracks feature requests and enhancement ideas for Map My Panel.

---

## 1. Entity Condition Tags & Work History

**Priority**: High
**Status**: Next Up

### Problem
There's no way to track important electrical conditions or maintenance history for entities. Real-world scenarios that need tracking:

1. **Grounding status**: Old 2-prong outlets replaced with self-grounding outlets need documentation that the circuit has no ground wire (even though a tester shows "no open ground" due to the self-grounding mechanism)
2. **Reverse polarity**: Outlets wired with hot/neutral reversed that can't be fixed immediately
3. **Work history**: When was an outlet last replaced or worked on?

Without this, you might forget in a year that position 19B has no ground wire in the circuit, even though the outlets test as grounded.

### Proposed Solution

#### Part A: Entity Tags/Conditions
A flexible tagging system for entities to track conditions:
- **"No Ground Wire"** - Circuit lacks ground conductor
- **"Grounded to Box"** - Self-grounding outlet, ground via metal box/conduit
- **"Reverse Polarity"** - Needs fixing
- **"GFCI Protected"** - Downstream of GFCI outlet
- Custom user-defined tags

#### Part B: Work History Log
Each entity can have an optional history/log:
- Date of last work
- What was done ("Replaced 2-prong with self-grounding outlet")
- Optional notes

### Technical Questions to Resolve

**Should grounding be tracked at breaker level or entity level?**

From electrical perspective:
- Ground wires are typically run per-circuit, so "no ground wire" would apply to entire breaker
- BUT self-grounding outlets in metal boxes CAN provide ground even without circuit ground wire
- Reverse polarity is definitely per-outlet (wiring error at that specific outlet)

**Recommendation**: Track at BOTH levels:
- Breaker: `has_ground_wire: boolean` - Does the circuit have a ground conductor?
- Entity: Tags for conditions like "grounded to box", "reverse polarity", etc.

This way, entities on a "no ground wire" circuit could inherit a visual indicator, but individual entities can override/clarify their specific situation.

### UI/UX Ideas
- Tags shown as colored badges on entity cards
- Breaker detail panel shows "No Ground Wire" warning that propagates to child entities
- Work history as expandable section on entity detail
- Filter entities by tag (e.g., "show all reverse polarity outlets")

### Database Changes
- New table: `entity_tags` (entity_id, tag_name, created_at)
- New table: `entity_work_log` (entity_id, work_date, description, notes, created_at)
- New column on breakers: `has_ground_wire` (boolean, default true)
- Or: Predefined tags table with colors/icons

---

## 2. Bidirectional Breaker Linking (was #1)

**Priority**: Medium
**Status**: Pending

### Problem
Currently, when linking breakers (e.g., for tandem breakers or multi-pole breakers), the link is only displayed in one direction. If breaker 17B is linked to 19A, the link shows on 17B but when viewing 19A, there's no indication that it's linked back to 17B.

### Example Scenario
- Tandem breaker situation: 17B (30A) is physically linked to 19A
- User links 19A to 17B through the UI
- When viewing 19A, 17B shows as an option in the linked breaker dropdown
- **Issue**: When viewing 17B, 19A does not appear as the linked breaker

### Proposed Solution
- Implement bidirectional linking so that when breaker A is linked to breaker B, the relationship automatically shows in both directions
- When viewing either breaker, the linked breaker should be visible
- UI should clearly indicate the linked relationship from both breakers' perspectives

### Technical Considerations
- Need to update the breaker model/database to support bidirectional relationships
- Update the UI to display linked breakers regardless of which side initiated the link
- Ensure cascade behavior when unlinking (remove from both directions)

---

## 3. Quick-Create Entity from Breaker Label

**Priority**: Low
**Status**: Pending

### Problem
For simple single-device circuits (Range, Generator, HVAC, Well Pump), the setup workflow feels redundant:

**Current Workflow:**
1. Edit breaker → Set label to "Range"
2. Configure breaker type (e.g., double-pole, 40A)
3. Create new entity → Name: "Range", Type: Appliance
4. Assign entity to breaker → Select "Range" breaker

**The Issue:** You're entering "Range" twice - once for the breaker label, once for the entity name. The entity creation feels like busywork when the breaker label already captures everything.

### Real-World Example
- **Breaker 5-7 (Double-pole):** "Range" - only the kitchen range is on this circuit
- **Breaker 9:** "Generator" - only the generator transfer switch
- **Breaker 11:** "Well Pump" - single device

For these simple circuits, the breaker label and entity name are identical, making entity creation feel like redundant data entry.

### Proposed Solution
Add a **"Quick-Create Entity from Breaker Label"** button in the Breaker Detail Panel:

**UI Flow:**
```
Breaker 5-7 - "Range" (40A Double-Pole)
Entities: (none)

Actions:
[⚡ Create "Range" Entity (ℹ️)]  ← Quick-create with tooltip
[+ Create New Entity]            ← Manual form
```

**Button Behavior:**
- Pre-fills entity name with breaker label ("Range")
- Pre-assigns entity to current breaker
- Opens entity form with name pre-filled, allowing user to:
  - Add room (e.g., "Kitchen")
  - Add location details if desired
  - Change entity type (defaults to "Appliance" for quick-create)
  - Save immediately or cancel

**Tooltip Content (on ℹ️ icon hover/click):**
> **Quick-Create Tip:** Use this for simple circuits where the breaker label describes the device (like "Range" or "Generator"). Creates an entity with the same name and assigns it to this breaker automatically.

### UI/UX Considerations
- **Tooltip on info icon** explains when/why to use this feature
- **Button only shows** when breaker has no entities assigned
- **Pre-filled form** saves time but still allows customization before saving
- **Not automatic** - user explicitly chooses when to use it (avoids unwanted entities)
- **Consistent with existing patterns** - still uses entity creation form, just pre-filled

### Technical Considerations
- No database schema changes needed (uses existing entity model)
- Button visibility conditional: `breaker.entities.length === 0`
- Pre-fill logic: `name = breaker.label`, `breaker_id = breaker.id`
- Default entity type for quick-create: "Appliance" (user can change)
- Form validation still applies (name required, etc.)

### Alternative Considered
**"Label-only" breakers (no entities required)** - Rejected because:
- Prevents adding entity-specific data like condition tags and work history later
- Creates inconsistent data model (some breakers have entities, some don't)
- Quick-create achieves the same goal (reduced friction) while maintaining data consistency

---

## 4. Circuit Flow Mapping (Entity Flow Diagram)

**Priority**: Low
**Status**: Planned for Future

### Problem
Users want to visualize the order and flow of entities on a circuit/breaker. Currently, entities are listed but there's no visual representation of how they're connected or ordered.

### Proposed Solution
Create a new "Circuit Map" tab with drag-and-drop functionality:
- **Breaker Selector**: Choose which breaker to map
- **Entity Sidebar**: List of entities assigned to the selected breaker
- **Canvas**: Drag entities from sidebar onto a canvas
- **Connections**: Draw lines/arrows between entities to show flow order
- **Persistence**: Save node positions and connections to database

### User Experience
1. Select a breaker from dropdown
2. See all entities on that breaker in sidebar
3. Drag entities onto canvas
4. Connect entities to show order (e.g., Outlet 1 → Outlet 2 → Outlet 3)
5. Auto-save positions and connections

### Technical Implementation
- Use React Flow library for node-based diagram
- New database table: `circuit_maps` (panel_id, breaker_id, nodes JSON, edges JSON)
- Export as PNG/SVG for printing

### Benefits
- Understand circuit topology
- Document daisy-chaining
- Troubleshoot electrical issues
- Reference during electrical work

---

## 5. Floor Plan Drawing Tool

**Priority**: Low
**Status**: Planned for Future (Long-term)

### Problem
Users want to see a bird's-eye view of their property with entity locations marked on a floor plan.

### Proposed Solution Option A: Drawing Tool
Build a drawing interface where users can:
- Draw rooms as rectangles/polygons
- Label rooms (auto-associate with existing room data)
- Place entity icons on walls/locations
- Link icons to existing entities in database

### Proposed Solution Option B: Image Upload + Pinning (Simpler)
- Users upload their own floor plan image/photo
- Pin entity icons onto the image at specific locations
- Link pins to existing entities
- Much simpler implementation than full drawing tool

### Proposed Solution Option C: Grid-Based Layout
- Simple grid representing the property
- Click cells to add rooms and entities
- Less flexible but easier to build

### Technical Considerations
- **Option A (Drawing)**: Complex - requires canvas manipulation, shape tools, layers
- **Option B (Image Upload)**: Medium complexity - image handling, pin placement
- **Option C (Grid)**: Simple - just a grid layout with clickable cells

### Recommendation
If pursued, start with **Option B (Image Upload + Pinning)** for fastest time-to-value.

---

## 6. UX Consistency: Auto-Save on Double-Pole Linking

**Priority**: Low (Polish)
**Status**: Pending

### Problem
When editing a breaker in the Breaker Detail sidebar, there's inconsistent state management around when changes are persisted:

**Current Behavior:**
- **Simple edits** (amperage, label) wait for "Save" button to persist
- **Double-pole linking** persists immediately (bypasses Save/Cancel buttons)

**Specific Example:**
1. Open Breaker 5 in sidebar
2. Change amperage from 20A → 30A (not yet saved)
3. Click "Link to Breaker 7" to create double-pole
4. Modal appears: "This will convert Breaker 7 to double-pole. Continue?"
5. Click "Yes" → **Double-pole link persists immediately to Breaker 7**
6. Click "Cancel" in sidebar → Amperage change **discarded**, but double-pole link **remains**

**The Issue:** Mixed mental model - some actions respect Save/Cancel, others bypass it.

### Proposed Solution
When confirming double-pole linking modal, **auto-save the current breaker's pending changes** as well:

**New Flow:**
1. Open Breaker 5 in sidebar
2. Change amperage from 20A → 30A (pending)
3. Click "Link to Breaker 7" to create double-pole
4. Modal: "This will link Breaker 5 to Breaker 7 as double-pole and save all pending changes. Continue?"
5. Click "Yes" → **Both breakers updated AND amperage change saved**
6. Sidebar auto-closes or shows "Saved" state (Save/Cancel buttons no longer needed)

**Why This Works:**
- Eliminates the inconsistency - confirming modal saves everything
- User gets clear warning that changes will persist
- No orphaned "pending" state after complex operations
- Cleaner UX - modal confirmation = full commit

### Technical Considerations
- On double-pole link confirmation, save current breaker's form state before persisting link
- Apply all pending changes (amperage, label, type, etc.) together with link operation
- Show success feedback: "Breaker 5 and Breaker 7 linked and saved"
- Consider closing sidebar after successful save (or disable Save/Cancel buttons)

### Alternative Considered
**Just clarify modal text** - Add "This will save immediately" to modal. Simpler but still leaves inconsistency in place.

### Notes
- Identified during December 2024 review
- Low priority - edge case that's mostly mitigated by modal confirmation
- Consider revisiting if users report confusion in practice

---

## Future Considerations

- **Bulk Operations**: Add/edit/remove multiple entities at once
- **Import/Export**: CSV import for bulk entity creation
- **Photos**: Attach photos to breakers or entities (e.g., photo of the outlet location)
- **History/Audit Log**: Track changes to panel configuration over time
- **Mobile Responsive**: Optimize UI for mobile devices for use while walking around the property

---

**Last Updated**: 2025-12-13
- Revised Feature Request #3: Changed from "Self-Labeling Breakers" to "Quick-Create Entity from Breaker Label" to better reflect actual user workflow and reduce data entry friction
- Added Feature Request #6: UX Consistency - Auto-save on double-pole linking to eliminate mixed state management behavior
