# Map My Panel - User Tutorial

## Overview

Map My Panel is an application that helps you document and organize your electrical panel(s). Keep track of which breakers control which outlets, switches, lights, and appliances throughout your property.

## Getting Started

### 1. Create Your First Property

When you first open the app, you'll need to create a property (e.g., your house, rental property, office).

1. Click the "Add Property" button
2. Enter the property name (e.g., "Main House", "55 Center St")
3. Click "Save"

### 2. Create a Panel

Each property can have multiple electrical panels (main panel, sub-panel, garage panel, etc.).

1. After creating a property, you'll be prompted to create your first panel
2. Enter the panel name (e.g., "Main Panel", "Garage Sub-Panel")
3. Specify the number of breaker positions (e.g., 40 for a standard residential panel)
4. Click "Create Panel"

## Working with Breakers

### Adding Breaker Information

1. Navigate to the **Breakers** tab
2. Click on any breaker position to edit it
3. Fill in the details:
   - **Amperage**: The breaker rating (15A, 20A, 30A, etc.)
   - **Voltage**: 120V or 240V
   - **Label**: Optional description (e.g., "Kitchen Outlets", "Air Conditioner")
   - **Status**:
     - `on` - Active breaker with entities
     - `spare` - Empty/unused breaker
     - `off` - Breaker that's turned off
   - **Linked Breaker**: For double-pole or tandem breakers, link to the paired breaker

### Breaker Positions

- Standard panels have positions like: 1, 2, 3... 40
- Some breakers may have tandem positions (e.g., 17A, 17B for two breakers in one slot)

## Managing Entities

Entities are the electrical devices/outlets controlled by each breaker.

### Adding an Entity

1. Go to the **Entities** tab
2. Click **Add Entity**
3. Fill in the details:
   - **Type**: outlet, switch, light, appliance, hvac, other (or create custom types)
   - **Name**: Descriptive name (e.g., "Kitchen Outlet 1", "Living Room Ceiling Fan")
   - **Room**: Select or create a room name
   - **Location**: Specific location details (e.g., "North wall by window")
   - **Breaker**: Assign to a specific breaker (optional)

### Custom Types

You can create custom entity types beyond the defaults (outlet, switch, light, appliance, hvac, other).

**To add a custom type:**
1. When adding/editing an entity, select "+ Add New Type" from the type dropdown
2. Enter the custom type name (e.g., "heater", "generator", "pool pump")
3. Click "Save"

**Note**: Custom types are shared across all panels in the same property.

## Using Filters and Search

### Filter by Room

1. In the **Entities** tab, use the room filter dropdown
2. Select a room to see only entities in that room

### Filter by Type

1. Use the type filter dropdown to view entities by type
2. Great for seeing all outlets, all switches, etc.

### Search

Use the search bar to find entities by name.

## Settings and Management

Access settings by clicking the gear icon (⚙️) in the top right.

### Properties Tab

- **Manage Properties**: View, rename, or delete properties
- **Switch Properties**: Change between different properties
- **Add New Property**: Create additional properties

### Current Panel Tab

- **Manage Custom Rooms**: Rename or delete custom room names
- **Manage Custom Types**: Rename, delete, or add custom entity types
- **Panel Settings**:
  - Rename the panel
  - Edit panel layout (change number of positions)
  - Reset panel (clears all breakers and entities, keeps panel structure)
  - Delete panel (completely removes panel and all data)

### Backup & Restore

- **Export Backup**: Save your entire database to a file
- **Import Backup**: Restore from a previous backup (WARNING: overwrites all current data)

### Export to PDF

Generate a printable PDF report of your panel configuration with all breakers and entities listed.

## Tips and Best Practices

### Mapping Your Panel

1. **Start with breakers**: Label all your breakers first with basic info
2. **Test breakers**: Turn off breakers one at a time to identify what they control
3. **Add entities as you discover them**: Document each outlet, switch, or appliance
4. **Use descriptive names**: "Kitchen Island Outlet - Right Side" is better than "Outlet 1"
5. **Take photos**: Consider taking photos of your panel to reference breaker positions

### Organization

- **Use rooms consistently**: Pick room names and stick with them (e.g., "Kitchen" not "kitchen" or "Kitchen/Dining")
- **Custom types for special cases**: Create custom types for unique items (pool equipment, outdoor lighting, etc.)
- **Link double-pole breakers**: Always link breakers that work together (240V circuits)

### Maintenance

- **Regular backups**: Export backups periodically, especially after major changes
- **Update as you renovate**: Keep the panel map current when adding/changing circuits

## Multiple Panels

If your property has multiple panels:

1. Create each panel with its own name (Main Panel, Sub-Panel, Garage)
2. Switch between panels using the panel dropdown in the top navigation
3. Custom rooms and types are shared across all panels in the property
4. Each panel maintains its own set of breakers and entity assignments

## Keyboard Shortcuts

- **Cmd/Ctrl + S**: Save when editing entities or breakers
- **Escape**: Cancel/close modals
- **Enter**: Save when in form inputs (custom types, custom rooms)

## Need Help?

If you encounter issues or have questions, please check the GitHub repository for documentation and to report bugs.

---

**Version**: 1.0
**Last Updated**: 2025-11-03
