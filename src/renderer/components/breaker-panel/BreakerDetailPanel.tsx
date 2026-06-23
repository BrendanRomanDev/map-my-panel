import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntitiesByBreaker, useEntities } from '../../hooks/useEntities'
import { useTagSelection } from '../../hooks/useTags'
import { AssignEntitiesModal } from './AssignEntitiesModal'
import { TagPicker } from '../tags/TagPicker'
import { AddEventModal } from '../history/AddEventModal'
import { queryKeys, invalidateEntityBreakerQueries } from '../../lib/queryKeys'
import type { BreakerWithEntityCount } from '@shared/types'

interface BreakerDetailPanelProps {
  breaker: BreakerWithEntityCount | null
  panelId: string
  onClose: () => void
}

export function BreakerDetailPanel({ breaker, panelId, onClose }: BreakerDetailPanelProps) {
  const queryClient = useQueryClient()
  const { data: allBreakers } = useBreakers(panelId)
  const { data: entities } = useEntitiesByBreaker(breaker?.id || '')
  const { data: allEntities } = useEntities(panelId)
  const { data: panel } = useQuery({
    queryKey: ['panel', panelId],
    queryFn: () => window.electronAPI.panels.findById(panelId),
    enabled: !!panelId
  })
  const tagSelection = useTagSelection('breaker', breaker?.id || null)

  const [label, setLabel] = useState('')
  const [amperage, setAmperage] = useState(15)
  const [breakerType, setBreakerType] = useState<'single-pole' | 'double-pole'>('single-pole')
  const [status, setStatus] = useState<'active' | 'spare'>('active')
  const [isPowered, setIsPowered] = useState(true)
  const [linkedBreakerId, setLinkedBreakerId] = useState<string | null>(null)
  const [assignedEntityIds, setAssignedEntityIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  // After a save that splits a double-pole, offer to log a split event on both
  // breakers. Holds the two breaker ids until the user logs or skips.
  const [pendingSplit, setPendingSplit] = useState<{ a: string; b: string } | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [breakerToConvert, setBreakerToConvert] = useState<string | null>(null)

  // Track original values for dirty detection
  const [originalValues, setOriginalValues] = useState({
    label: '',
    amperage: 15,
    breakerType: 'single-pole' as 'single-pole' | 'double-pole',
    status: 'active' as 'active' | 'spare',
    isPowered: true,
    linkedBreakerId: null as string | null,
    entityIds: new Set<string>()
  })

  // Initialize form when breaker or entities change
  useEffect(() => {
    if (breaker && entities) {
      const entityIds = new Set(entities.map(e => e.id))
      setLabel(breaker.label || '')
      setAmperage(breaker.amperage)
      setBreakerType(breaker.breaker_type)
      setStatus(breaker.status)
      setIsPowered(breaker.is_powered)
      setLinkedBreakerId(breaker.linked_breaker_id)
      setAssignedEntityIds(entityIds)

      // Store original values
      setOriginalValues({
        label: breaker.label || '',
        amperage: breaker.amperage,
        breakerType: breaker.breaker_type,
        status: breaker.status,
        isPowered: breaker.is_powered,
        linkedBreakerId: breaker.linked_breaker_id,
        entityIds
      })
    }
  }, [breaker, entities])

  // Close the drawer on Escape, matching the modal convention used elsewhere.
  useEffect(() => {
    if (!breaker) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [breaker, onClose])

  if (!breaker) return null

  // Detect if anything has changed
  const hasChanges =
    label !== originalValues.label ||
    amperage !== originalValues.amperage ||
    breakerType !== originalValues.breakerType ||
    status !== originalValues.status ||
    isPowered !== originalValues.isPowered ||
    linkedBreakerId !== originalValues.linkedBreakerId ||
    assignedEntityIds.size !== originalValues.entityIds.size ||
    ![...assignedEntityIds].every(id => originalValues.entityIds.has(id)) ||
    tagSelection.hasChanges

  const handleSave = async () => {
    setIsSaving(true)
    // A split = previously linked to a breaker, now no longer linked to it.
    const splitFromId =
      originalValues.linkedBreakerId && originalValues.linkedBreakerId !== linkedBreakerId
        ? originalValues.linkedBreakerId
        : null
    try {
      // Update breaker properties
      await window.electronAPI.breakers.update(breaker.id, {
        label: label || null,
        amperage,
        breaker_type: breakerType,
        status,
        is_powered: isPowered,
        linked_breaker_id: linkedBreakerId
      })

      // Sync properties to linked breaker (for double-pole breakers)
      // Status, power state, and amperage must match between linked breakers
      if (linkedBreakerId && breakerType === 'double-pole') {
        await window.electronAPI.breakers.update(linkedBreakerId, {
          amperage,
          status,
          is_powered: isPowered
        })
      }

      // If changing from double-pole to single-pole, unassign all entities from this breaker
      if (originalValues.breakerType === 'double-pole' && breakerType === 'single-pole') {
        // Get all entities currently assigned to this breaker
        const entitiesToUnassign = allEntities?.filter(e => e.breaker_ids.includes(breaker.id)) || []
        for (const entity of entitiesToUnassign) {
          // Remove this breaker from the entity's breaker_ids
          const newBreakerIds = entity.breaker_ids.filter(id => id !== breaker.id)
          await window.electronAPI.entities.update(entity.id, { breaker_ids: newBreakerIds })
        }
        // Clear the local assignedEntityIds since we unassigned everything
        setAssignedEntityIds(new Set())
      }

      // Handle bidirectional linking for double-pole breakers
      if (linkedBreakerId !== originalValues.linkedBreakerId) {
        // If previously linked to a different breaker, clear that link
        if (originalValues.linkedBreakerId && originalValues.linkedBreakerId !== linkedBreakerId) {
          await window.electronAPI.breakers.update(originalValues.linkedBreakerId, {
            linked_breaker_id: null
          })
        }

        // If now linked to a new breaker, update it to link back
        if (linkedBreakerId) {
          await window.electronAPI.breakers.update(linkedBreakerId, {
            linked_breaker_id: breaker.id
          })
        }
      }

      // Update entity assignments
      const originalIds = originalValues.entityIds
      const currentIds = assignedEntityIds

      // Entities to unassign (were assigned, now aren't)
      const toUnassign = [...originalIds].filter(id => !currentIds.has(id))

      // Entities to assign (weren't assigned, now are)
      const toAssign = [...currentIds].filter(id => !originalIds.has(id))

      // Unassign entities - remove this breaker (and linked partner if double-pole) from their breaker_ids array
      for (const entityId of toUnassign) {
        const entity = allEntities?.find(e => e.id === entityId)
        if (entity) {
          let newBreakerIds = entity.breaker_ids.filter(id => id !== breaker.id)
          // If this is a double-pole breaker with a linked partner, also remove that (use current state, not original)
          if (linkedBreakerId) {
            newBreakerIds = newBreakerIds.filter(id => id !== linkedBreakerId)
          }
          await window.electronAPI.entities.update(entityId, { breaker_ids: newBreakerIds })
        }
      }

      // Assign entities - add this breaker (and linked partner if double-pole) to their breaker_ids array
      for (const entityId of toAssign) {
        const entity = allEntities?.find(e => e.id === entityId)
        if (entity) {
          const newBreakerIds = [...entity.breaker_ids, breaker.id]
          // If this is a double-pole breaker with a linked partner, also add that (use current state, not original)
          if (linkedBreakerId && !newBreakerIds.includes(linkedBreakerId)) {
            newBreakerIds.push(linkedBreakerId)
          }
          await window.electronAPI.entities.update(entityId, { breaker_ids: newBreakerIds })
        }
      }

      // Invalidate queries to refresh data for both this breaker and linked breaker
      const queriesToInvalidate = invalidateEntityBreakerQueries(panelId, breaker.id, breaker.id)
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      // Also invalidate queries for the linked breaker if it exists
      if (linkedBreakerId) {
        const linkedQueries = invalidateEntityBreakerQueries(panelId, linkedBreakerId, linkedBreakerId)
        linkedQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      // Persist staged tag attach/detach changes
      await tagSelection.persist()

      // If this save split a double-pole, offer to log a split event on both
      // halves before closing. Otherwise close normally.
      if (splitFromId) {
        setIsSaving(false)
        setPendingSplit({ a: breaker.id, b: splitFromId })
        return
      }

      onClose()
    } catch (error) {
      console.error('Failed to update breaker:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTandem = async () => {
    try {
      // Find the next available slot for this position
      const existingSlots = allBreakers
        ?.filter(b => b.position === breaker.position)
        .map(b => b.position_slot)
        .filter(Boolean) || []

      const nextSlot = !existingSlots.includes('a') ? 'a' : !existingSlots.includes('b') ? 'b' : null

      if (!nextSlot) {
        alert('This position already has 2 tandem breakers (a and b)')
        return
      }

      // If this is the first tandem breaker being added (no existing slots),
      // convert the base breaker to a container
      if (existingSlots.length === 0) {
        await window.electronAPI.breakers.update(breaker.id, {
          is_container: true,
          amperage: null,
          breaker_type: null
        })
      }

      await window.electronAPI.breakers.create({
        panel_id: panelId,
        position: breaker.position,
        position_slot: nextSlot,
        breaker_type: 'single-pole',
        amperage: 15,
        status: 'spare'
      })

      queryClient.invalidateQueries({ queryKey: ['breakers', panelId] })
      onClose()
    } catch (error) {
      console.error('Failed to add tandem breaker:', error)
    }
  }

  const handleUnassignEntity = (entityId: string) => {
    // Remove from local state - will save on "Save Changes"
    setAssignedEntityIds(prev => {
      const next = new Set(prev)
      next.delete(entityId)
      return next
    })
  }

  const handleAssignEntities = (entityIds: string[]) => {
    // Add to local state - will save on "Save Changes"
    setAssignedEntityIds(prev => {
      const next = new Set(prev)
      entityIds.forEach(id => next.add(id))
      return next
    })

    // When assigning entities, automatically set the breaker to active and powered on
    if (entityIds.length > 0) {
      setStatus('active')
      setIsPowered(true)
    }

    setIsAssignModalOpen(false)
  }

  const handleLinkedBreakerChange = (selectedBreakerId: string) => {
    if (!selectedBreakerId) {
      // User selected "Not linked"
      setLinkedBreakerId(null)
      return
    }

    // Find the selected breaker
    const selectedBreaker = allBreakers?.find(b => b.id === selectedBreakerId)
    if (!selectedBreaker) return

    // Check if the selected breaker is double-pole
    if (selectedBreaker.breaker_type !== 'double-pole') {
      // Show confirmation dialog to convert it
      setBreakerToConvert(selectedBreakerId)
      setShowConvertConfirm(true)
    } else {
      // Already double-pole, just set the link
      setLinkedBreakerId(selectedBreakerId)
    }
  }

  const handleConfirmConvert = async () => {
    if (!breakerToConvert) return

    try {
      // Convert the breaker to double-pole and link it back to the current breaker
      // Also sync properties (amperage, status, power state) to match current breaker
      await window.electronAPI.breakers.update(breakerToConvert, {
        breaker_type: 'double-pole',
        linked_breaker_id: breaker.id,
        amperage,
        status,
        is_powered: isPowered
      })

      // Update the current breaker to link to the converted breaker
      await window.electronAPI.breakers.update(breaker.id, {
        linked_breaker_id: breakerToConvert
      })

      // Set the link in local state
      setLinkedBreakerId(breakerToConvert)

      // Update original values since we already saved the link to the database
      setOriginalValues(prev => ({
        ...prev,
        linkedBreakerId: breakerToConvert
      }))

      // Refresh breakers data immediately (refetch instead of invalidate to ensure data is fresh)
      await queryClient.refetchQueries({ queryKey: queryKeys.breakers.byPanel(panelId) })

      // Close dialog
      setShowConvertConfirm(false)
      setBreakerToConvert(null)
    } catch (error) {
      console.error('Failed to convert breaker to double-pole:', error)
      alert('Failed to convert breaker to double-pole')
    }
  }

  const handleCancelConvert = () => {
    setShowConvertConfirm(false)
    setBreakerToConvert(null)
  }

  const handleDeleteTandem = async () => {
    if (!breaker) return

    setIsDeleting(true)
    try {
      // Unassign all entities from this breaker first - remove this breaker (and linked partner if double-pole) from their breaker_ids arrays
      if (entities && entities.length > 0) {
        for (const entity of entities) {
          let newBreakerIds = entity.breaker_ids.filter(id => id !== breaker.id)
          // If this is a double-pole breaker with a linked partner, also remove that (use current state, not original)
          // (since deleting one pole of a 240V circuit makes the circuit unusable)
          if (linkedBreakerId) {
            newBreakerIds = newBreakerIds.filter(id => id !== linkedBreakerId)
          }
          await window.electronAPI.entities.update(entity.id, { breaker_ids: newBreakerIds })
        }
      }

      // Check if this is the last tandem breaker at this position
      // If so, convert the base breaker back to a regular breaker
      if (breaker.position_slot) {
        const otherTandemsAtPosition = allBreakers?.filter(
          b => b.position === breaker.position &&
               b.position_slot &&
               b.id !== breaker.id
        ) || []

        // If this is the last tandem breaker, convert base breaker back to regular
        if (otherTandemsAtPosition.length === 0) {
          const baseBreaker = allBreakers?.find(
            b => b.position === breaker.position && !b.position_slot
          )

          if (baseBreaker) {
            // Unmap any entities from the base breaker
            const baseBreakerEntities = entities?.filter(e =>
              e.breaker_ids.includes(baseBreaker.id)
            ) || []

            for (const entity of baseBreakerEntities) {
              const newBreakerIds = entity.breaker_ids.filter(id => id !== baseBreaker.id)
              await window.electronAPI.entities.update(entity.id, { breaker_ids: newBreakerIds })
            }

            // Convert base breaker back to regular breaker
            await window.electronAPI.breakers.update(baseBreaker.id, {
              is_container: false,
              amperage: 15,
              breaker_type: 'single-pole'
            })
          }
        }
      }

      // Delete the breaker
      await window.electronAPI.breakers.delete(breaker.id)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.breakers.byPanel(panelId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panelId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.unmapped(panelId) })

      onClose()
    } catch (error) {
      console.error('Failed to delete tandem breaker:', error)
      alert('Failed to delete tandem breaker')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Get available breakers for linking
  // For double-pole breakers, restrict to adjacent positions (directly above or below)
  // In a standard 2-column panel, breakers link vertically (position ±2)
  const availableBreakersForLinking = allBreakers?.filter(b => {
    if (b.id === breaker.id) return false

    // Only allow breakers that are unlinked OR already linked to current breaker
    if (b.linked_breaker_id && b.linked_breaker_id !== breaker.id) return false

    // Calculate adjacent positions (above = position - 2, below = position + 2)
    const currentPosition = breaker.position
    const adjacentPositions = [currentPosition - 2, currentPosition + 2]

    // Allow breakers at adjacent positions (including tandems at those positions)
    return adjacentPositions.includes(b.position)
  }) || []

  // Find linked breaker if exists
  const linkedBreaker = linkedBreakerId
    ? allBreakers?.find(b => b.id === linkedBreakerId)
    : null

  return (
    <>
      {/* Scrim — sits below the drawer, above the panel grid. Click to close. */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer — z-50 matches the standard modal layer so nested confirms (z-[60]) render above. */}
      <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg flex flex-col z-50">
        {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Breaker {breaker.position}
              {breaker.position_slot && <span className="text-sm">{breaker.position_slot}</span>}
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit breaker configuration
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Tags */}
        {panel && !breaker.is_container && (
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <TagPicker
              propertyId={panel.property_id}
              selectedTagIds={tagSelection.selectedTagIds}
              onChange={tagSelection.setSelectedTagIds}
            />
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={20}
              placeholder="e.g., Kitchen, Garage"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max 20 characters
            </p>
          </div>

          {/* Hide technical fields for container breakers */}
          {!breaker.is_container && (
            <>
              {/* Amperage */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amperage
                </label>
                <select
                  value={amperage}
                  onChange={e => setAmperage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value={15}>15A</option>
                  <option value={20}>20A</option>
                  <option value={30}>30A</option>
                  <option value={40}>40A</option>
                  <option value={50}>50A</option>
                  <option value={60}>60A</option>
                </select>
              </div>

              {/* Breaker Type */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Breaker Type
                </label>
                <select
                  value={breakerType}
                  onChange={e => {
                    const newType = e.target.value as 'single-pole' | 'double-pole'
                    const oldType = breakerType
                    setBreakerType(newType)
                    // If changing from double-pole to single-pole, optimistically clear entities and links
                    if (oldType === 'double-pole' && newType === 'single-pole') {
                      setLinkedBreakerId(null)
                      setAssignedEntityIds(new Set()) // Clear all assigned entities
                    }
                  }}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="single-pole">Single-Pole (120V)</option>
                  <option value="double-pole">Double-Pole (240V)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'active' | 'spare')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="active">Active</option>
                  <option value="spare">Spare</option>
                </select>
              </div>

              {/* Power State */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPowered}
                    onChange={e => setIsPowered(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium">Breaker is powered ON</div>
                    <div className="text-xs text-muted-foreground">
                      Is the breaker switch physically turned on?
                    </div>
                  </div>
                </label>
              </div>

              {/* Linked Breaker (for double-pole) */}
              {breakerType === 'double-pole' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Link to Breaker (240V pair)
                  </label>
                  <select
                    value={linkedBreakerId || ''}
                    onChange={e => handleLinkedBreakerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Not linked</option>
                    {availableBreakersForLinking.map(b => (
                      <option key={b.id} value={b.id}>
                        Position {b.position}
                        {b.position_slot && b.position_slot}
                        {b.label && ` - ${b.label}`}
                        {b.breaker_type === 'single-pole' && ' (Single-Pole)'}
                      </option>
                    ))}
                  </select>
                  {linkedBreaker && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Linked to position {linkedBreaker.position}
                      {linkedBreaker.position_slot}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tandem Breaker Actions */}
        <div className="pt-4 border-t border-border space-y-2">
          {!breaker.position_slot && (
            <>
              <button
                onClick={handleAddTandem}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted text-sm"
              >
                + Add Tandem Breaker
              </button>
              <p className="text-xs text-muted-foreground">
                Add another breaker (a/b) to this position
              </p>
            </>
          )}
          {breaker.position_slot && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 text-sm"
              >
                Delete Tandem Breaker ({breaker.position}{breaker.position_slot})
              </button>
              <p className="text-xs text-muted-foreground">
                {entities && entities.length > 0
                  ? `Warning: ${entities.length} ${entities.length === 1 ? 'entity is' : 'entities are'} assigned and will become unmapped`
                  : 'Remove this tandem breaker from position ' + breaker.position
                }
              </p>
            </>
          )}
        </div>

        {/* Assigned Entities - hide for containers */}
        {!breaker.is_container && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">
                Assigned Entities ({assignedEntityIds.size})
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted"
              >
                + Assign
              </button>
            </div>
          {allEntities && allEntities.filter(e => assignedEntityIds.has(e.id)).length > 0 ? (
            <div className="space-y-2">
              {allEntities.filter(e => assignedEntityIds.has(e.id)).map(entity => (
                <div
                  key={entity.id}
                  className="p-2 border border-border rounded text-sm flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{entity.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {entity.entity_type}
                      {entity.room && ` • ${entity.room}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassignEntity(entity.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Unassign from breaker"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No entities assigned yet
            </div>
          )}
          </div>
        )}
      </div>

      {/* Sticky Footer with Actions */}
      <div className="flex-shrink-0 p-6 border-t border-border bg-background">
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Assign Entities Modal */}
      <AssignEntitiesModal
        breakerId={breaker.id}
        panelId={panelId}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignEntities}
        currentLinkedBreakerId={linkedBreakerId}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[400px] p-6">
            <h3 className="text-lg font-bold mb-2">Delete Tandem Breaker?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete breaker <strong>{breaker.position}{breaker.position_slot}</strong>?
            </p>
            {entities && entities.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">
                  Warning: {entities.length} {entities.length === 1 ? 'entity' : 'entities'} will become unmapped
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  {entities.map(e => (
                    <li key={e.id}>• {e.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTandem}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Breaker'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Double-Pole Confirmation Modal */}
      {showConvertConfirm && breakerToConvert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[400px] p-6">
            <h3 className="text-lg font-bold mb-2">Convert Breaker to Double-Pole?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The breaker you're trying to link to (<strong>
                {allBreakers?.find(b => b.id === breakerToConvert)?.position}
                {allBreakers?.find(b => b.id === breakerToConvert)?.position_slot}
              </strong>) is currently a single-pole breaker.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Would you like to convert it to a double-pole breaker and create the link?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelConvert}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Convert to Double-Pole
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Split-double-pole prompt: prefilled event on both former halves */}
      {pendingSplit && panel && (
        <AddEventModal
          propertyId={panel.property_id}
          panelId={panelId}
          title="Log this split?"
          initialNewTypeName="Split double-pole"
          initialNotes="Split from double-pole into independent breakers."
          initialTargets={[
            { target_type: 'breaker', target_id: pendingSplit.a },
            { target_type: 'breaker', target_id: pendingSplit.b }
          ]}
          onClose={() => {
            setPendingSplit(null)
            onClose()
          }}
        />
      )}
    </>
  )
}
