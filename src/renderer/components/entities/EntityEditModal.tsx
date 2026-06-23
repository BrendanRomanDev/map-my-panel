import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { queryKeys, invalidateEntityBreakerQueries } from '../../lib/queryKeys'
import { RoomSelector } from '../shared/RoomSelector'
import { TypeSelector } from '../shared/TypeSelector'
import { TagPicker } from '../tags/TagPicker'
import type { Entity } from '@shared/types'

interface EntityEditModalProps {
  entity: Entity | null
  isOpen: boolean
  onClose: () => void
}

export function EntityEditModal({ entity, isOpen, onClose }: EntityEditModalProps) {
  const queryClient = useQueryClient()
  const { data: allBreakers } = useBreakers(entity?.panel_id || '')
  const { data: panel } = useQuery({
    queryKey: ['panel', entity?.panel_id],
    queryFn: () => window.electronAPI.panels.findById(entity!.panel_id),
    enabled: !!entity?.panel_id
  })

  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState<string>('outlet')
  const [room, setRoom] = useState('')
  const [location, setLocation] = useState('')
  const [breakerIds, setBreakerIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Filter and sort breakers for display
  const displayBreakers = useMemo(() => {
    if (!allBreakers) return []

    // Filter out tandem base positions (positions without slots that have tandem breakers)
    const filtered = allBreakers.filter(breaker => {
      // If this breaker has a slot, keep it
      if (breaker.position_slot) return true

      // If this breaker has no slot, check if there are other breakers with the same position but with slots
      const hasTandemBreakers = allBreakers.some(
        b => b.position === breaker.position && b.position_slot
      )

      // Keep only if there are NO tandem breakers (i.e., it's a regular non-tandem position)
      return !hasTandemBreakers
    })

    // Sort by position number, then by slot (A before B)
    return filtered.sort((a, b) => {
      // First sort by position number
      if (a.position !== b.position) {
        return a.position - b.position
      }

      // If positions are the same, sort by slot
      const slotA = a.position_slot || ''
      const slotB = b.position_slot || ''
      return slotA.localeCompare(slotB)
    })
  }, [allBreakers])

  // Initialize form when entity changes
  useEffect(() => {
    if (entity) {
      setName(entity.name)
      setEntityType(entity.entity_type)
      setRoom(entity.room || '')
      setLocation(entity.location || '')
      setBreakerIds(entity.breaker_ids)
    }
  }, [entity])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Escape to cancel
      if (e.key === 'Escape' && !showDeleteConfirm) {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showDeleteConfirm, name, entityType, room, location, breakerIds])

  if (!isOpen || !entity) return null

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Entity name is required')
      return
    }

    setIsSaving(true)
    try {
      const oldBreakerIds = entity.breaker_ids
      const newBreakerIds = breakerIds

      // Update the entity - this is the critical operation
      await window.electronAPI.entities.update(entity.id, {
        name: name.trim(),
        entity_type: entityType,
        room: room.trim() || null,
        location: location.trim() || null,
        breaker_ids: breakerIds
      })

      // Entity updated successfully - now do best-effort post-update operations
      // If these fail, we still want to close the modal since the entity was updated
      try {
        // Invalidate all relevant queries for old and new breakers
        const allAffectedBreakerIds = [...new Set([...oldBreakerIds, ...newBreakerIds])]
        const queriesToInvalidate = [
          queryKeys.entities.byPanel(entity.panel_id),
          queryKeys.entities.byRoom(entity.panel_id),
          queryKeys.entities.unmapped(entity.panel_id),
          queryKeys.breakers.byPanel(entity.panel_id),
          ...allAffectedBreakerIds.map(breakerId => queryKeys.entities.byBreaker(breakerId))
        ]

        await Promise.all(
          queriesToInvalidate.map(queryKey =>
            queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
          )
        )
      } catch (postError) {
        // Log but don't block - entity was updated successfully
        console.error('Post-update operations failed:', postError)
      }

      onClose()
    } catch (error) {
      console.error('Failed to update entity:', error)
      alert('Failed to update entity')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await window.electronAPI.entities.delete(entity.id)

      // Invalidate queries to refresh data
      const queriesToInvalidate = [
        queryKeys.entities.byPanel(entity.panel_id),
        queryKeys.entities.byRoom(entity.panel_id),
        queryKeys.entities.unmapped(entity.panel_id),
        queryKeys.breakers.byPanel(entity.panel_id),
        ...entity.breaker_ids.map(breakerId => queryKeys.entities.byBreaker(breakerId))
      ]

      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      onClose()
    } catch (error) {
      console.error('Failed to delete entity:', error)
      alert('Failed to delete entity')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      {/* Main modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Edit Entity</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Update entity information
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Kitchen Outlet 1"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Type
              </label>
              <TypeSelector
                panelId={entity?.panel_id || ''}
                value={entityType}
                onChange={setEntityType}
                placeholder="Select or add type"
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Room (optional)
              </label>
              <RoomSelector
                panelId={entity?.panel_id || ''}
                value={room}
                onChange={setRoom}
                placeholder="Select or add room"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Location (optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., North wall by window"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            {/* Tags */}
            {panel && (
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <TagPicker targetType="entity" targetId={entity.id} propertyId={panel.property_id} />
              </div>
            )}

            {/* Breaker Assignment */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Assigned Breakers (optional)
              </label>
              {!displayBreakers || displayBreakers.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No breakers available
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto border border-input rounded-md bg-background">
                  {displayBreakers.map(breaker => {
                    const isChecked = breakerIds.includes(breaker.id)
                    return (
                      <label
                        key={breaker.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          isChecked ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Add this breaker
                              const newIds = [...breakerIds, breaker.id]
                              // If this is a double-pole breaker with a linked partner, add that too
                              if (breaker.linked_breaker_id && !newIds.includes(breaker.linked_breaker_id)) {
                                newIds.push(breaker.linked_breaker_id)
                              }
                              setBreakerIds(newIds)
                            } else {
                              // Remove this breaker
                              let newIds = breakerIds.filter(id => id !== breaker.id)
                              // If this is a double-pole breaker with a linked partner, remove that too
                              if (breaker.linked_breaker_id) {
                                newIds = newIds.filter(id => id !== breaker.linked_breaker_id)
                              }
                              setBreakerIds(newIds)
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex-1">
                          Position {breaker.position}{breaker.position_slot || ''}
                          {breaker.label && ` - ${breaker.label}`}
                          {' '}({breaker.amperage}A{breaker.breaker_type === 'double-pole' ? ', DP' : ''})
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              {breakerIds.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {breakerIds.length} breaker{breakerIds.length === 1 ? '' : 's'} selected
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex justify-between">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isDeleting || !name.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[400px] p-6">
            <h3 className="text-lg font-bold mb-2">Delete Entity?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete "<strong>{entity.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
