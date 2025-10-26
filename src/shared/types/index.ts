// Core data models matching SQLite schema

export interface Panel {
  id: string
  name: string
  total_positions: number
  created_at: Date
  updated_at: Date
}

export interface Breaker {
  id: string
  panel_id: string
  position: number
  breaker_type: 'single-pole' | 'double-pole'
  amperage: number
  label: string | null  // Optional user-defined label (max 20 chars)
  status: 'active' | 'spare'
  created_at: Date
  updated_at: Date
}

export interface Entity {
  id: string
  panel_id: string
  breaker_id: string | null  // null = unmapped entity
  entity_type: 'outlet' | 'switch' | 'light' | 'appliance' | 'hvac' | 'other'
  name: string
  room: string | null  // Optional room grouping
  location: string | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

// Input types for create operations
export interface CreatePanelInput {
  name: string
  total_positions: number
}

export interface CreateBreakerInput {
  panel_id: string
  position: number
  breaker_type: 'single-pole' | 'double-pole'
  amperage: number
  label?: string | null
  status?: 'active' | 'spare'
}

export interface CreateEntityInput {
  panel_id: string
  breaker_id?: string | null
  entity_type: 'outlet' | 'switch' | 'light' | 'appliance' | 'hvac' | 'other'
  name: string
  room?: string | null
  location?: string | null
  metadata?: Record<string, unknown>
}

// Input types for update operations
export interface UpdatePanelInput {
  name?: string
  total_positions?: number
}

export interface UpdateBreakerInput {
  breaker_type?: 'single-pole' | 'double-pole'
  amperage?: number
  label?: string | null
  status?: 'active' | 'spare'
}

export interface UpdateEntityInput {
  breaker_id?: string | null
  entity_type?: 'outlet' | 'switch' | 'light' | 'appliance' | 'hvac' | 'other'
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
