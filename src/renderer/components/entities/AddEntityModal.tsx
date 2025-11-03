import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { queryKeys, invalidateEntityBreakerQueries } from '../../lib/queryKeys'
import { RoomSelector } from '../shared/RoomSelector'
import { TypeSelector } from '../shared/TypeSelector'
import type { CreateEntityInput } from '@shared/types'

interface AddEntityModalProps {
  panelId: string
  isOpen: boolean
  onClose: () => void
}

export function AddEntityModal({ panelId, isOpen, onClose }: AddEntityModalProps) {
  const queryClient = useQueryClient()
  const { data: breakers } = useBreakers(panelId)

  const [entityType, setEntityType] = useState<string>('outlet')
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [location, setLocation] = useState('')
  const [breakerId, setBreakerId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const input: CreateEntityInput = {
        panel_id: panelId,
        breaker_id: breakerId,
        entity_type: entityType,
        name: name.trim(),
        room: room.trim() || null,
        location: location.trim() || null,
        metadata: {}
      }

      // Create the entity - this is the critical operation
      await window.electronAPI.entities.create(input)

      // Entity created successfully - now do best-effort post-creation operations
      // If these fail, we still want to close the modal since the entity was created
      try {
        // Auto-activate breaker if this is the first entity on it
        if (breakerId) {
          const entitiesOnBreaker = await window.electronAPI.entities.listByBreaker(breakerId)

          // If this is the only entity on this breaker, set it to "on"
          if (entitiesOnBreaker.length === 1) {
            await window.electronAPI.breakers.update(breakerId, {
              status: 'on'
            })
          }
        }
      } catch (postError) {
        // Log but don't block - entity was created successfully
        console.error('Post-creation operations failed:', postError)
      }

      // Invalidate all relevant queries - use helper function and refetch
      const queriesToInvalidate = invalidateEntityBreakerQueries(panelId, null, breakerId)
      await Promise.all(
        queriesToInvalidate.map(queryKey =>
          queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
        )
      )

      // Reset form and close - entity was created successfully
      setEntityType('outlet')
      setName('')
      setRoom('')
      setLocation('')
      setBreakerId(null)
      onClose()
    } catch (error) {
      console.error('Failed to create entity:', error)
      alert('Failed to create entity')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEntityType('outlet')
    setName('')
    setRoom('')
    setLocation('')
    setBreakerId(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Add Entity</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new electrical entity to your panel
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <TypeSelector
              panelId={panelId}
              value={entityType}
              onChange={setEntityType}
              placeholder="Select or add type"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kitchen Outlet 1"
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium mb-1">Room</label>
            <RoomSelector
              panelId={panelId}
              value={room}
              onChange={setRoom}
              placeholder="Select or add room"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Behind refrigerator"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Breaker */}
          <div>
            <label className="block text-sm font-medium mb-1">Breaker</label>
            <select
              value={breakerId || ''}
              onChange={(e) => setBreakerId(e.target.value || null)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Unknown / Not Assigned</option>
              {breakers?.map(breaker => (
                <option key={breaker.id} value={breaker.id}>
                  Position {breaker.position}{breaker.position_slot || ''} - {breaker.amperage}A
                  {breaker.label ? ` (${breaker.label})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Adding...' : 'Add Entity'}
          </button>
        </div>
      </div>
    </div>
  )
}
