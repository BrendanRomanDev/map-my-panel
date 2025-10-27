import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { queryKeys } from '../../lib/queryKeys'
import { RoomSelector } from '../shared/RoomSelector'
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

      await window.electronAPI.entities.create(input)

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panelId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byRoom(panelId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.unmapped(panelId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.breakers.byPanel(panelId) })

      if (breakerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.byBreaker(breakerId) })
      }

      // Reset form and close
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
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="outlet">Outlet</option>
              <option value="switch">Switch</option>
              <option value="light">Light</option>
              <option value="appliance">Appliance</option>
              <option value="hvac">HVAC</option>
              <option value="other">Other</option>
            </select>
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
