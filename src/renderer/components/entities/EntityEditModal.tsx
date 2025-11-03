import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { queryKeys, invalidateEntityBreakerQueries } from '../../lib/queryKeys'
import { RoomSelector } from '../shared/RoomSelector'
import { TypeSelector } from '../shared/TypeSelector'
import type { Entity } from '@shared/types'

interface EntityEditModalProps {
  entity: Entity | null
  isOpen: boolean
  onClose: () => void
}

export function EntityEditModal({ entity, isOpen, onClose }: EntityEditModalProps) {
  const queryClient = useQueryClient()
  const { data: allBreakers } = useBreakers(entity?.panel_id || '')

  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState<string>('outlet')
  const [room, setRoom] = useState('')
  const [location, setLocation] = useState('')
  const [breakerId, setBreakerId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form when entity changes
  useEffect(() => {
    if (entity) {
      setName(entity.name)
      setEntityType(entity.entity_type)
      setRoom(entity.room || '')
      setLocation(entity.location || '')
      setBreakerId(entity.breaker_id)
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
  }, [isOpen, showDeleteConfirm, name, entityType, room, location, breakerId])

  if (!isOpen || !entity) return null

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Entity name is required')
      return
    }

    setIsSaving(true)
    try {
      const oldBreakerId = entity.breaker_id
      const newBreakerId = breakerId

      // Update the entity - this is the critical operation
      await window.electronAPI.entities.update(entity.id, {
        name: name.trim(),
        entity_type: entityType,
        room: room.trim() || null,
        location: location.trim() || null,
        breaker_id: breakerId
      })

      // Entity updated successfully - now do best-effort post-update operations
      // If these fail, we still want to close the modal since the entity was updated
      try {
        // Auto-activate breaker if this is the first entity on it
        // Only if breaker changed and we're assigning to a new breaker
        if (newBreakerId && oldBreakerId !== newBreakerId) {
          const entitiesOnNewBreaker = await window.electronAPI.entities.listByBreaker(newBreakerId)

          // If this is the only entity on this breaker, set it to "on"
          if (entitiesOnNewBreaker.length === 1) {
            await window.electronAPI.breakers.update(newBreakerId, {
              status: 'on'
            })
          }
        }

        // Invalidate all relevant queries - use helper function and refetch
        const queriesToInvalidate = invalidateEntityBreakerQueries(entity.panel_id, entity.breaker_id, breakerId)
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
      const queriesToInvalidate = invalidateEntityBreakerQueries(entity.panel_id, entity.breaker_id, null)
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

            {/* Breaker Assignment */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Assigned Breaker (optional)
              </label>
              <select
                value={breakerId || ''}
                onChange={e => setBreakerId(e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Unknown / Not assigned</option>
                {allBreakers?.map(breaker => (
                  <option key={breaker.id} value={breaker.id}>
                    Position {breaker.position}
                    {breaker.position_slot && breaker.position_slot}
                    {breaker.label && ` - ${breaker.label}`}
                    {' '}({breaker.amperage}A)
                  </option>
                ))}
              </select>
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
