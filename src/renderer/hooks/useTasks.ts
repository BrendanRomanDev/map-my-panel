import { useQuery } from '@tanstack/react-query'
import type { TargetType } from '@shared/types'
import { queryKeys } from '../lib/queryKeys'

// All tasks across a property (property + panels + breakers + entities), with a
// resolved target label/room. Powers the property-wide Tasks view.
export function useTasksForProperty(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.byProperty(propertyId || ''),
    queryFn: () => window.electronAPI.tasks.listForProperty(propertyId!),
    enabled: !!propertyId
  })
}

// Tasks for a single target (panel/breaker/entity/property).
export function useTasksForTarget(targetType: TargetType, targetId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.byTarget(targetType, targetId || ''),
    queryFn: () => window.electronAPI.tasks.listForTarget(targetType, targetId!),
    enabled: !!targetId
  })
}

// Open-task count for a target (for the card badge).
export function useOpenTaskCount(targetType: TargetType, targetId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.openCount(targetType, targetId || ''),
    queryFn: () => window.electronAPI.tasks.openCountForTarget(targetType, targetId!),
    enabled: !!targetId
  })
}

// Task templates for a property (includes globals). Powers save-as-template
// and bulk-apply-to-many.
export function useTaskTemplates(propertyId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.templates(propertyId || ''),
    queryFn: () => window.electronAPI.tasks.listTemplates(propertyId!),
    enabled: !!propertyId
  })
}
