# Feature Requests

This document tracks feature requests and enhancement ideas for Map My Panel.

---

## 1. Bidirectional Breaker Linking

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

## 2. Self-Labeling Breakers (Label-Only Breakers)

**Priority**: Medium
**Status**: Pending

### Problem
Some breakers are descriptive enough with just their label and don't require individual entities to be created. Examples include:
- "Kitchen Outlets" - covers all kitchen outlets as a group
- "Generator" - single-purpose breaker
- "Garage Lights" - all garage lights on one breaker

Currently, breakers without entities show as incomplete or "missing entities," but in these cases, the breaker label itself is the complete description.

### Proposed Solution
Add a "self-labeling" or "label-only" mode for breakers where:
- The breaker label is considered sufficient documentation
- No entities need to be created
- Breaker shows as active/complete (not as "missing entities" or spare)
- Status indicator reflects that the breaker is properly documented

### UI/UX Considerations
- Add a checkbox or toggle: "Label-only breaker" or "Self-labeling"
- When enabled:
  - Entity list is hidden/disabled for that breaker
  - Breaker shows as "active" with just the label
  - No warnings about missing entities
  - Visual indicator that it's a self-labeled breaker
- Make it easy to convert back to regular breaker if user later wants to add entities

### Technical Considerations
- Add a `is_self_labeled` or `label_only` boolean field to the Breaker model
- Update breaker status logic to treat self-labeled breakers as complete
- Update UI components to hide entity-related features for self-labeled breakers
- Ensure filtering and search still work properly

---

## 3. Circuit Flow Mapping (Entity Flow Diagram)

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

## 4. Floor Plan Drawing Tool

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

## Future Considerations

- **Bulk Operations**: Add/edit/remove multiple entities at once
- **Import/Export**: CSV import for bulk entity creation
- **Photos**: Attach photos to breakers or entities (e.g., photo of the outlet location)
- **History/Audit Log**: Track changes to panel configuration over time
- **Mobile Responsive**: Optimize UI for mobile devices for use while walking around the property

---

**Last Updated**: 2025-11-03 (Added themes and mapping features)
