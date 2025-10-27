/**
 * Centralized React Query key factory
 * Ensures consistency across queries and invalidations
 */

export const queryKeys = {
  // Panel keys
  panels: {
    all: ['panels'] as const,
    detail: (panelId: string) => ['panels', panelId] as const,
  },

  // Breaker keys
  breakers: {
    all: ['breakers'] as const,
    byPanel: (panelId: string) => ['breakers', panelId] as const,
    detail: (breakerId: string) => ['breakers', 'detail', breakerId] as const,
  },

  // Entity keys
  entities: {
    all: ['entities'] as const,
    byPanel: (panelId: string) => ['entities', panelId] as const,
    byRoom: (panelId: string) => ['entities', 'byRoom', panelId] as const,
    byBreaker: (breakerId: string) => ['entities', 'byBreaker', breakerId] as const,
    unmapped: (panelId: string) => ['entities', 'unmapped', panelId] as const,
    detail: (entityId: string) => ['entities', 'detail', entityId] as const,
  },
} as const

/**
 * Helper to invalidate all entity-related queries for a panel
 */
export const invalidateAllEntityQueries = (panelId: string) => ({
  entities: queryKeys.entities.byPanel(panelId),
  byRoom: queryKeys.entities.byRoom(panelId),
  unmapped: queryKeys.entities.unmapped(panelId),
})

/**
 * Helper to invalidate queries when entity breaker assignment changes
 */
export const invalidateEntityBreakerQueries = (
  panelId: string,
  oldBreakerId: string | null,
  newBreakerId: string | null
) => {
  const queries = [
    queryKeys.entities.byPanel(panelId),
    queryKeys.entities.byRoom(panelId),
    queryKeys.entities.unmapped(panelId),
    queryKeys.breakers.byPanel(panelId),
  ]

  if (oldBreakerId) {
    queries.push(queryKeys.entities.byBreaker(oldBreakerId))
  }
  if (newBreakerId) {
    queries.push(queryKeys.entities.byBreaker(newBreakerId))
  }

  return queries
}
