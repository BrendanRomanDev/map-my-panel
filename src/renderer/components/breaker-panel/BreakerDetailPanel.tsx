import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntitiesByBreaker, useEntities } from '../../hooks/useEntities'
import { useTagSelection } from '../../hooks/useTags'
import { AssignEntitiesModal } from './AssignEntitiesModal'
import { TagPicker } from '../tags/TagPicker'
import { logBreakerLinkChange, mergeBreakerHistories } from '../../lib/historyActions'
import { planLinkChange, isLinkError, type LinkPlan } from '../../lib/breakerLinking'
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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Staged double-pole link change (committed on Save Changes, not on dialog OK).
  // pendingLinkPlan holds the planned breaker updates + warnings; the dialog
  // collects the opt-in choices. Null when no link change is pending.
  const [pendingLinkPlan, setPendingLinkPlan] = useState<LinkPlan | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [logLinkChange, setLogLinkChange] = useState(false)
  const [mergeOnLink, setMergeOnLink] = useState(false)
  const [makeSelfSingle, setMakeSelfSingle] = useState(false)

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
    tagSelection.hasChanges ||
    !!pendingLinkPlan

  const handleSave = async () => {
    setIsSaving(true)
    // The staged link plan (if any) is the source of truth for breaker_type /
    // linked_breaker_id across self + partner(s).
    const plan = pendingLinkPlan
    const selfUpdate = plan?.updates.find(u => u.id === breaker.id)
    try {
      // Update this breaker's own fields. If a link plan exists, it dictates
      // breaker_type + linked_breaker_id; otherwise use the form values.
      await window.electronAPI.breakers.update(breaker.id, {
        label: label || null,
        amperage,
        breaker_type: selfUpdate ? selfUpdate.breaker_type : breakerType,
        status,
        is_powered: isPowered,
        linked_breaker_id: selfUpdate ? selfUpdate.linked_breaker_id : linkedBreakerId
      })

      // Apply the plan's updates to the OTHER breakers (old partner, new partner).
      if (plan) {
        for (const u of plan.updates) {
          if (u.id === breaker.id) continue
          await window.electronAPI.breakers.update(u.id, {
            breaker_type: u.breaker_type,
            linked_breaker_id: u.linked_breaker_id
          })
        }
      }

      // Sync shared properties to the (final) linked partner for a double-pole.
      const finalLinkedId = selfUpdate ? selfUpdate.linked_breaker_id : linkedBreakerId
      if (finalLinkedId && (selfUpdate ? selfUpdate.breaker_type : breakerType) === 'double-pole') {
        await window.electronAPI.breakers.update(finalLinkedId, {
          amperage,
          status,
          is_powered: isPowered
        })
      }

      // If this breaker is dropping to single-pole, unassign its entities.
      const becomingSingle = selfUpdate
        ? selfUpdate.breaker_type === 'single-pole' && originalValues.breakerType === 'double-pole'
        : originalValues.breakerType === 'double-pole' && breakerType === 'single-pole'
      if (becomingSingle) {
        const entitiesToUnassign = allEntities?.filter(e => e.breaker_ids.includes(breaker.id)) || []
        for (const entity of entitiesToUnassign) {
          const newBreakerIds = entity.breaker_ids.filter(id => id !== breaker.id)
          await window.electronAPI.entities.update(entity.id, { breaker_ids: newBreakerIds })
        }
        setAssignedEntityIds(new Set())
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

      // Apply the link plan's opt-in history actions (if a link change was staged).
      if (plan && panel) {
        // Opt-in: merge prior histories of the newly-formed pair.
        if (mergeOnLink && plan.newPartnerId) {
          await mergeBreakerHistories(queryClient, breaker.id, plan.newPartnerId)
        }
        // Opt-in: one "log this change" event covering the transition, on the
        // breakers involved (self + new partner if combining, else self + old).
        if (logLinkChange) {
          const otherId = plan.newPartnerId || plan.abandonedPartnerId
          if (otherId) {
            await logBreakerLinkChange(queryClient, {
              propertyId: panel.property_id,
              breakerAId: breaker.id,
              breakerBId: otherId,
              kind: plan.newPartnerId ? 'combined' : 'split'
            })
          }
        }
        // Refresh breaker grid so type/link changes show on the cards.
        queryClient.invalidateQueries({ queryKey: queryKeys.breakers.byPanel(panelId) })
      }

      // Clear the staged plan now that it's committed.
      setPendingLinkPlan(null)

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

  // Plan a link change (link/unlink/re-link). Validates and either surfaces an
  // error or stages a plan + opens the confirm dialog. Nothing persists here —
  // the actual breaker updates happen on Save Changes.
  const handleLinkedBreakerChange = (selectedBreakerId: string) => {
    const targetId = selectedBreakerId || null
    const result = planLinkChange(breaker, targetId, false, allBreakers || [])

    if (isLinkError(result)) {
      setLinkError(result.error)
      return
    }

    // No-op (re-selected the same partner)
    if (result.updates.length === 0) {
      setLinkedBreakerId(targetId)
      return
    }

    // Stage it: reflect the new link locally and remember the plan + reset opts.
    setLinkedBreakerId(targetId)
    setMakeSelfSingle(false)
    setMergeOnLink(false)
    setLogLinkChange(false)
    setPendingLinkPlan(result)
    setLinkDialogOpen(true)
  }

  // Recompute the plan when the user toggles "also make this breaker single-pole"
  // (only relevant while unlinking).
  const recomputePlanWithSelfSingle = (next: boolean) => {
    setMakeSelfSingle(next)
    const result = planLinkChange(breaker, linkedBreakerId, next, allBreakers || [])
    if (!isLinkError(result)) setPendingLinkPlan(result)
  }

  const handleCancelLinkChange = () => {
    // Revert the staged link back to what it was; discard the plan.
    setLinkedBreakerId(originalValues.linkedBreakerId)
    setPendingLinkPlan(null)
    setLinkDialogOpen(false)
    setMakeSelfSingle(false)
    setMergeOnLink(false)
    setLogLinkChange(false)
  }

  const handleConfirmLinkChange = () => {
    // Just close the dialog — the plan stays staged and commits on Save.
    setLinkDialogOpen(false)
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
                  {pendingLinkPlan && !linkDialogOpen && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Link change staged — applies when you Save Changes.
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

      {/* Link error (target already paired) */}
      {linkError && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[400px] p-6">
            <h3 className="text-lg font-bold mb-2">Can't link these breakers</h3>
            <p className="text-sm text-muted-foreground mb-4">{linkError}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setLinkError(null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staged link-change dialog (collects opts; commits on Save Changes) */}
      {linkDialogOpen && pendingLinkPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[420px] p-6">
            <h3 className="text-lg font-bold mb-2">
              {linkedBreakerId ? 'Link these breakers?' : 'Unlink this breaker?'}
            </h3>

            {pendingLinkPlan.warnings.length > 0 && (
              <ul className="text-sm text-muted-foreground mb-3 list-disc pl-5 space-y-1">
                {pendingLinkPlan.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className="space-y-2 mb-4 border-t border-border pt-3">
              {/* Unlink-only: also drop the edited breaker to single-pole */}
              {!linkedBreakerId && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={makeSelfSingle}
                    onChange={e => recomputePlanWithSelfSingle(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Also make this breaker single-pole
                    <span className="block text-xs text-muted-foreground">
                      Leave off if you plan to link it to a different breaker.
                    </span>
                  </span>
                </label>
              )}

              {/* Link-only: merge prior histories of the new pair */}
              {pendingLinkPlan.newPartnerId && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mergeOnLink}
                    onChange={e => setMergeOnLink(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Merge their prior history
                    <span className="block text-xs text-muted-foreground">
                      Existing events become shared by both. Off = keep past separate.
                    </span>
                  </span>
                </label>
              )}

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={logLinkChange}
                  onChange={e => setLogLinkChange(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Log this as a change event (today)
                  <span className="block text-xs text-muted-foreground">
                    Adds a "{linkedBreakerId ? 'Combined into' : 'Split'} double-pole" entry. Skip
                    during initial setup.
                  </span>
                </span>
              </label>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Nothing is saved until you click <strong>Save Changes</strong>.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelLinkChange}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLinkChange}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
