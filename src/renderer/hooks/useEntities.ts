import { useQuery } from '@tanstack/react-query'
import type { Entity, EntitiesByRoom } from '@shared/types'

export function useEntities(panelId: string) {
  return useQuery({
    queryKey: ['entities', panelId],
    queryFn: () => window.electronAPI.entities.listByPanel(panelId)
  })
}

export function useEntitiesByRoom(panelId: string) {
  return useQuery({
    queryKey: ['entities', 'byRoom', panelId],
    queryFn: () => window.electronAPI.entities.groupByRoom(panelId)
  })
}

export function useUnmappedEntities(panelId: string) {
  return useQuery({
    queryKey: ['entities', 'unmapped', panelId],
    queryFn: () => window.electronAPI.entities.listUnmapped(panelId)
  })
}

export function useEntitiesByBreaker(breakerId: string) {
  return useQuery({
    queryKey: ['entities', 'byBreaker', breakerId],
    queryFn: () => window.electronAPI.entities.listByBreaker(breakerId)
  })
}
