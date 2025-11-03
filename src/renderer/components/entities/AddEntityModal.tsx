import { useState, useEffect } from 'react'
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
  initialBreakerIds?: string[]
  createAsUnmapped?: boolean
  onEntityCreated?: () => void
}

export function AddEntityModal({ panelId, isOpen, onClose, initialBreakerIds, createAsUnmapped, onEntityCreated }: AddEntityModalProps) {
  const queryClient = useQueryClient()
  const { data: breakers } = useBreakers(panelId)

  const [entityType, setEntityType] = useState<string>('outlet')
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [location, setLocation] = useState('')
  const [breakerIds, setBreakerIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Initialize breaker IDs when modal opens with initialBreakerIds
  useEffect(() => {
    if (isOpen && initialBreakerIds && initialBreakerIds.length > 0) {
      setBreakerIds(initialBreakerIds)
    }
  }, [isOpen, initialBreakerIds])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const input: CreateEntityInput = {
        panel_id: panelId,
        breaker_ids: createAsUnmapped ? [] : breakerIds,
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
        // Invalidate all relevant queries
        const actualBreakerIds = createAsUnmapped ? [] : breakerIds
        const queriesToInvalidate = [
          queryKeys.entities.byPanel(panelId),
          queryKeys.entities.byRoom(panelId),
          queryKeys.entities.unmapped(panelId),
          queryKeys.breakers.byPanel(panelId),
          ...actualBreakerIds.map(breakerId => queryKeys.entities.byBreaker(breakerId))
        ]

        await Promise.all(
          queriesToInvalidate.map(queryKey =>
            queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
          )
        )
      } catch (postError) {
        // Log but don't block - entity was created successfully
        console.error('Post-creation operations failed:', postError)
      }

      // Notify parent that entity was created
      onEntityCreated?.()

      // Reset form and close - entity was created successfully
      setEntityType('outlet')
      setName('')
      setRoom('')
      setLocation('')
      setBreakerIds([])
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
    setBreakerIds([])
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

          {/* Breaker Assignment */}
          <div>
            <label className="block text-sm font-medium mb-2">Breakers (optional)</label>
            {!breakers || breakers.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                No breakers available
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto border border-input rounded-md bg-background">
                {breakers.map(breaker => {
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
