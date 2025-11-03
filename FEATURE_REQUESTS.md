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

## Future Considerations

- **Bulk Operations**: Add/edit/remove multiple entities at once
- **Import/Export**: CSV import for bulk entity creation
- **Photos**: Attach photos to breakers or entities (e.g., photo of the outlet location)
- **History/Audit Log**: Track changes to panel configuration over time
- **Mobile Responsive**: Optimize UI for mobile devices for use while walking around the property

---

**Last Updated**: 2025-10-29
