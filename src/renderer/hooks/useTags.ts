import { useQuery } from '@tanstack/react-query'
import type { TargetType } from '@shared/types'
import { queryKeys } from '../lib/queryKeys'

// All tags available for a property (property-scoped + global)
export function useTags(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.tags.byProperty(propertyId || ''),
    queryFn: () => window.electronAPI.tags.listForProperty(propertyId!),
    enabled: !!propertyId
  })
}

// Tags attached to a specific target (panel/breaker/entity/property)
export function useTagsForTarget(targetType: TargetType, targetId: string | null) {
  return useQuery({
    queryKey: queryKeys.tags.byTarget(targetType, targetId || ''),
    queryFn: () => window.electronAPI.tags.listForTarget(targetType, targetId!),
    enabled: !!targetId
  })
}
