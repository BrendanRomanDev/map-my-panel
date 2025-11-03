import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntitiesByBreaker, useEntities } from '../../hooks/useEntities'
import { AssignEntitiesModal } from './AssignEntitiesModal'
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
    ![...assignedEntityIds].every(id => originalValues.entityIds.has(id))

  const handleSave = async () => {
    setIsSaving(true)
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

      // Update entity assignments
      const originalIds = originalValues.entityIds
      const currentIds = assignedEntityIds

      // Entities to unassign (were assigned, now aren't)
      const toUnassign = [...originalIds].filter(id => !currentIds.has(id))

      // Entities to assign (weren't assigned, now are)
      const toAssign = [...currentIds].filter(id => !originalIds.has(id))

      // Unassign entities
      for (const entityId of toUnassign) {
        await window.electronAPI.entities.update(entityId, { breaker_id: null })
      }

      // Assign entities
      for (const entityId of toAssign) {
        await window.electronAPI.entities.update(entityId, { breaker_id: breaker.id })
      }

      // Invalidate queries to refresh data
      const queriesToInvalidate = invalidateEntityBreakerQueries(panelId, breaker.id, breaker.id)
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

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
    setIsAssignModalOpen(false)
  }

  const handleDeleteTandem = async () => {
    if (!breaker) return

    setIsDeleting(true)
    try {
      // Unassign all entities from this breaker first
      if (entities && entities.length > 0) {
        for (const entity of entities) {
          await window.electronAPI.entities.update(entity.id, { breaker_id: null })
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

  // Get available breakers for linking (double-pole)
  // Allow breakers that are either unlinked OR linked to the current breaker (for bidirectional display)
  const availableBreakersForLinking = allBreakers?.filter(b =>
    b.id !== breaker.id &&
    b.breaker_type === 'double-pole' &&
    (!b.linked_breaker_id || b.linked_breaker_id === breaker.id)
  ) || []

  // Find linked breaker if exists
  const linkedBreaker = linkedBreakerId
    ? allBreakers?.find(b => b.id === linkedBreakerId)
    : null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
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
              onChange={e => setBreakerType(e.target.value as 'single-pole' | 'double-pole')}
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
                onChange={e => setLinkedBreakerId(e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Not linked</option>
                {availableBreakersForLinking.map(b => (
                  <option key={b.id} value={b.id}>
                    Position {b.position}
                    {b.position_slot && b.position_slot}
                    {b.label && ` - ${b.label}`}
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

        {/* Assigned Entities */}
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

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
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
    </div>
  )
}
