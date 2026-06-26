import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'

// All tasks for entities on a panel (with entity name/room), for the Tasks view.
export function useTasksForPanel(panelId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.byPanel(panelId || ''),
    queryFn: () => window.electronAPI.tasks.listForPanel(panelId!),
    enabled: !!panelId
  })
}

// Tasks for a single entity.
export function useTasksForEntity(entityId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.byEntity(entityId || ''),
    queryFn: () => window.electronAPI.tasks.listForEntity(entityId!),
    enabled: !!entityId
  })
}

// Open-task count for an entity (for the card badge).
export function useOpenTaskCount(entityId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.openCount(entityId || ''),
    queryFn: () => window.electronAPI.tasks.openCountForEntity(entityId!),
    enabled: !!entityId
  })
}
