// Core data models matching SQLite schema

export interface Property {
  id: string
  name: string
  custom_entity_types: string[]  // User-defined entity types (stored as JSON array in DB)
  is_current: boolean
  created_at: number
  updated_at: number
}

export interface Panel {
  id: string
  property_id: string
  name: string
  total_positions: number
  main_breaker_amperage: number  // Total panel capacity (e.g., 100A, 200A)
  created_at: Date
  updated_at: Date
}

export interface Breaker {
  id: string
  panel_id: string
  position: number  // Physical row number (1-50)
  position_slot: 'a' | 'b' | null  // For tandem breakers (19a, 19b), null for regular single breakers
  breaker_type: 'single-pole' | 'double-pole' | null  // NULL for container breakers
  amperage: number | null  // NULL for container breakers (specs belong to child breakers)
  label: string | null  // Optional user-defined label (max 20 chars)
  status: 'active' | 'spare'  // Is circuit installed/wired?
  is_powered: boolean  // Is the breaker switch physically ON?
  is_container: boolean  // True for tandem base positions that hold child breakers
  linked_breaker_id: string | null  // For double-pole breakers that span two positions
  created_at: Date
  updated_at: Date
}

export interface Entity {
  id: string
  panel_id: string
  breaker_ids: string[]  // Array of breaker IDs (empty array = unmapped, multiple IDs = double-pole)
  entity_type: string  // Default types: outlet, switch, light, appliance, hvac + custom user-defined types
  name: string
  room: string | null  // Optional room grouping
  location: string | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

// Input types for create operations
export interface CreatePropertyInput {
  name: string
}

export interface CreatePanelInput {
  property_id: string
  name: string
  total_positions: number
  main_breaker_amperage: number
}

export interface CreateBreakerInput {
  panel_id: string
  position: number
  position_slot?: 'a' | 'b' | null
  breaker_type?: 'single-pole' | 'double-pole' | null  // NULL for containers
  amperage?: number | null  // NULL for containers
  label?: string | null
  status?: 'active' | 'spare'
  is_powered?: boolean
  is_container?: boolean
  linked_breaker_id?: string | null
}

export interface CreateEntityInput {
  panel_id: string
  breaker_ids?: string[]
  entity_type: string  // Default types: outlet, switch, light, appliance, hvac + custom user-defined types
  name: string
  room?: string | null
  location?: string | null
  metadata?: Record<string, unknown>
}

// Input types for update operations
export interface UpdatePropertyInput {
  name?: string
}

export interface UpdatePanelInput {
  name?: string
  total_positions?: number
  main_breaker_amperage?: number
}

export interface UpdateBreakerInput {
  position_slot?: 'a' | 'b' | null
  breaker_type?: 'single-pole' | 'double-pole' | null
  amperage?: number | null
  label?: string | null
  status?: 'active' | 'spare'
  is_powered?: boolean
  is_container?: boolean
  linked_breaker_id?: string | null
}

export interface UpdateEntityInput {
  breaker_ids?: string[]
  entity_type?: string  // Default types: outlet, switch, light, appliance, hvac + custom user-defined types
  name?: string
  room?: string | null
  location?: string | null
  metadata?: Record<string, unknown>
}

// Extended types for views with additional data
export interface BreakerWithEntityCount extends Breaker {
  entity_count: number
}

export interface EntitiesByRoom {
  room: string | null
  entities: Entity[]
}

// ---------------------------------------------------------------------------
// Tags & History (see docs/architecture-tags-and-history.md)
// ---------------------------------------------------------------------------

// What a tag or history event can attach to (polymorphic target).
// 'property' supports standalone events not tied to any panel/breaker/entity
// (e.g. a utility-company note about the whole-house meter).
export const TARGET_TYPES = {
  PROPERTY: 'property',
  PANEL: 'panel',
  BREAKER: 'breaker',
  ENTITY: 'entity'
} as const
export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES]

export interface Tag {
  id: string
  property_id: string | null  // null = global, shared across all properties
  name: string
  description: string | null  // shown in hover popover (esp. when condensed to icon)
  color: string | null  // semantic/theme-aware badge color key
  icon: string | null  // emoji/icon shown when condensed
  condense: boolean  // collapse to icon on crowded cards
  created_at: Date
  updated_at: Date
}

export interface TagLink {
  id: string
  tag_id: string
  target_type: TargetType
  target_id: string
  created_at: Date
}

export interface EventType {
  id: string
  property_id: string | null  // null = global
  name: string
  created_at: Date
}

export interface HistoryEvent {
  id: string
  property_id: string
  event_type_id: string | null  // null if the type was deleted
  title: string | null
  notes: string | null
  occurred_on: string  // editable maintenance date, YYYY-MM-DD
  logged_at: Date  // immutable record timestamp
  tag_id: string | null  // optional attached tag (editable)
  created_at: Date
  updated_at: Date
}

export interface EventLink {
  id: string
  event_id: string
  target_type: TargetType
  target_id: string
  created_at: Date
}

// A target reference used by bulk-add and link-editing operations
export interface TargetRef {
  target_type: TargetType
  target_id: string
}

// Input types
export interface CreateTagInput {
  property_id: string | null  // null = create as global
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  condense?: boolean
}

export interface UpdateTagInput {
  name?: string
  description?: string | null
  color?: string | null
  icon?: string | null
  condense?: boolean
}

export interface CreateEventTypeInput {
  property_id: string | null  // null = global
  name: string
}

export interface UpdateEventTypeInput {
  name?: string
}

export interface CreateHistoryEventInput {
  property_id: string
  event_type_id?: string | null
  title?: string | null
  notes?: string | null
  occurred_on: string  // YYYY-MM-DD
  tag_id?: string | null
  // One event, many links (bulk add). If omitted/empty, the repository
  // auto-attaches the event to its property (standalone note, e.g. a
  // utility-company incident not tied to any panel/breaker/entity).
  targets?: TargetRef[]
}

export interface UpdateHistoryEventInput {
  event_type_id?: string | null
  title?: string | null
  notes?: string | null
  occurred_on?: string
  tag_id?: string | null
}

// Extended views
export interface HistoryEventWithDetails extends HistoryEvent {
  event_type_name: string | null
  tag: Tag | null
  targets: TargetRef[]
}

// A history event as seen in a rolled-up view (e.g. a breaker showing events
// from its assigned entities). `via` describes how the event reached this
// view: 'direct' = attached to the viewed target itself; otherwise the name
// of the entity it bubbled up through.
export interface RolledUpHistoryEvent extends HistoryEventWithDetails {
  via: 'direct' | { entityId: string; entityName: string }
}

// ---------------------------------------------------------------------------
// Tasks (entity-linked to-dos) — see docs/prd/epic-4-tasks.md
// ---------------------------------------------------------------------------

export const TASK_STATUS = { OPEN: 'open', DONE: 'done' } as const
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

// Default task types the UI offers (also accepts custom strings).
export const DEFAULT_TASK_TYPES = [
  'Self-Ground',
  'Map Circuit',
  'Replace Outlet',
  'Inspect',
  'Other'
] as const

// Completion rules wired onto a task (or template). Tag ids are app-owned data,
// so this stays unopinionated — the user/agent decides what the rules mean.
export interface TaskRules {
  on_create_tag_id: string | null
  on_complete_remove_tag_ids: string[]
  on_complete_add_tag_ids: string[]
  on_complete_log_history: boolean
}

export interface Task extends TaskRules {
  id: string
  entity_id: string
  title: string
  notes: string | null
  task_type: string | null
  status: TaskStatus
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

export interface CreateTaskInput {
  entity_id: string
  title: string
  notes?: string | null
  task_type?: string | null
  on_create_tag_id?: string | null
  on_complete_remove_tag_ids?: string[]
  on_complete_add_tag_ids?: string[]
  on_complete_log_history?: boolean
}

export interface TaskTemplate extends TaskRules {
  id: string
  property_id: string | null
  name: string
  task_type: string | null
  title_template: string
  notes: string | null
  created_at: Date
}

export interface CreateTaskTemplateInput {
  property_id: string | null
  name: string
  task_type?: string | null
  title_template: string
  notes?: string | null
  on_create_tag_id?: string | null
  on_complete_remove_tag_ids?: string[]
  on_complete_add_tag_ids?: string[]
  on_complete_log_history?: boolean
}

export interface UpdateTaskInput {
  title?: string
  notes?: string | null
  task_type?: string | null
}

// Task plus its entity's name/room (for the list view without extra lookups).
export interface TaskWithEntity extends Task {
  entity_name: string
  entity_room: string | null
}
