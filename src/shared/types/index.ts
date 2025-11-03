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
  breaker_type: 'single-pole' | 'double-pole'
  amperage: number
  label: string | null  // Optional user-defined label (max 20 chars)
  status: 'active' | 'spare'  // Is circuit installed/wired?
  is_powered: boolean  // Is the breaker switch physically ON?
  linked_breaker_id: string | null  // For double-pole breakers that span two positions
  created_at: Date
  updated_at: Date
}

export interface Entity {
  id: string
  panel_id: string
  breaker_id: string | null  // null = unmapped entity
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
  breaker_type: 'single-pole' | 'double-pole'
  amperage: number
  label?: string | null
  status?: 'active' | 'spare'
  is_powered?: boolean
  linked_breaker_id?: string | null
}

export interface CreateEntityInput {
  panel_id: string
  breaker_id?: string | null
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
  breaker_type?: 'single-pole' | 'double-pole'
  amperage?: number
  label?: string | null
  status?: 'active' | 'spare'
  is_powered?: boolean
  linked_breaker_id?: string | null
}

export interface UpdateEntityInput {
  breaker_id?: string | null
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
