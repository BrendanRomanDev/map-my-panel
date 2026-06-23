import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

// Staged tag-selection for a save/cancel host (modal or drawer). Loads the
// target's current tag ids into local state; `selectedTagIds`/`setSelectedTagIds`
// are the pending selection (no DB writes). `hasChanges` feeds the host's dirty
// detection; `persist()` diffs against the original and runs attach/detach,
// then invalidates so cards refresh. Cancelling the host simply discards state.
export function useTagSelection(targetType: TargetType, targetId: string | null) {
  const queryClient = useQueryClient()
  const { data: currentTags } = useTagsForTarget(targetType, targetId)

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([])

  useEffect(() => {
    if (currentTags) {
      const ids = currentTags.map(t => t.id)
      setSelectedTagIds(ids)
      setOriginalTagIds(ids)
    }
  }, [currentTags])

  const originalSet = new Set(originalTagIds)
  const selectedSet = new Set(selectedTagIds)
  const hasChanges =
    originalSet.size !== selectedSet.size ||
    selectedTagIds.some(id => !originalSet.has(id))

  const persist = async () => {
    if (!targetId) return
    const toAttach = selectedTagIds.filter(id => !originalSet.has(id))
    const toDetach = originalTagIds.filter(id => !selectedSet.has(id))
    await Promise.all([
      ...toAttach.map(id => window.electronAPI.tags.attach(id, targetType, targetId)),
      ...toDetach.map(id => window.electronAPI.tags.detach(id, targetType, targetId))
    ])
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byTarget(targetType, targetId) })
  }

  return { selectedTagIds, setSelectedTagIds, hasChanges, persist }
}
