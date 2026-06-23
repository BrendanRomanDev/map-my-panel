import { useQuery } from '@tanstack/react-query'
import type { TargetType } from '@shared/types'
import { queryKeys } from '../lib/queryKeys'

// History events attached to a specific target (panel/breaker/entity/property)
export function useHistoryForTarget(targetType: TargetType, targetId: string | null) {
  return useQuery({
    queryKey: queryKeys.history.byTarget(targetType, targetId || ''),
    queryFn: () => window.electronAPI.history.listForTarget(targetType, targetId!),
    enabled: !!targetId
  })
}

// Rolled-up breaker history: direct events + events on assigned entities
export function useBreakerHistoryRollup(breakerId: string | null) {
  return useQuery({
    queryKey: queryKeys.history.breakerRollup(breakerId || ''),
    queryFn: () => window.electronAPI.history.listForBreakerRollup(breakerId!),
    enabled: !!breakerId
  })
}

// All history events for a property (global timeline)
export function useHistoryForProperty(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.history.byProperty(propertyId || ''),
    queryFn: () => window.electronAPI.history.listForProperty(propertyId!),
    enabled: !!propertyId
  })
}

// Event types available for a property (scoped + global)
export function useEventTypes(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.history.eventTypes(propertyId || ''),
    queryFn: () => window.electronAPI.history.listEventTypes(propertyId!),
    enabled: !!propertyId
  })
}
