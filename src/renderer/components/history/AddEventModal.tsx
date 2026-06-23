import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TargetRef } from '@shared/types'
import { useEventTypes } from '../../hooks/useHistory'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TargetPicker } from './TargetPicker'

interface AddEventModalProps {
  propertyId: string
  panelId: string
  // Pre-checked target the modal was opened from
  initialTarget: { target_type: TargetRef['target_type']; target_id: string; label: string }
  onClose: () => void
}

function todayYmd(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function AddEventModal({ propertyId, panelId, initialTarget, onClose }: AddEventModalProps) {
  const queryClient = useQueryClient()
  const { data: eventTypes } = useEventTypes(propertyId)
  const { data: tags } = useTags(propertyId)

  const [eventTypeId, setEventTypeId] = useState<string>('')
  const [newTypeName, setNewTypeName] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayYmd())
  const [tagId, setTagId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [targets, setTargets] = useState<TargetRef[]>([
    { target_type: initialTarget.target_type, target_id: initialTarget.target_id }
  ])
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (targets.length === 0) return
    setIsSaving(true)
    try {
      // Resolve event type: create-on-the-fly if a new name was typed
      let resolvedTypeId: string | null = eventTypeId || null
      const typed = newTypeName.trim()
      if (typed) {
        const created = await window.electronAPI.history.createEventType({
          property_id: propertyId,
          name: typed
        })
        resolvedTypeId = created.id
        queryClient.invalidateQueries({ queryKey: queryKeys.history.eventTypes(propertyId) })
      }

      await window.electronAPI.history.createEvent({
        property_id: propertyId,
        event_type_id: resolvedTypeId,
        notes: notes.trim() || null,
        occurred_on: occurredOn,
        tag_id: tagId || null,
        targets
      })

      // Refresh timelines for every affected target + property
      targets.forEach(t =>
        queryClient.invalidateQueries({ queryKey: queryKeys.history.byTarget(t.target_type, t.target_id) })
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.history.byProperty(propertyId) })

      onClose()
    } catch (error) {
      console.error('Failed to create history event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-4">Add History Event</h3>

        <div className="space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Event Type</label>
            <select
              value={eventTypeId}
              onChange={e => {
                setEventTypeId(e.target.value)
                setNewTypeName('')
              }}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            >
              <option value="">— Select —</option>
              {(eventTypes || []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              value={newTypeName}
              onChange={e => {
                setNewTypeName(e.target.value)
                if (e.target.value) setEventTypeId('')
              }}
              placeholder="...or type a new event type"
              className="w-full text-sm px-2 py-1 mt-1 rounded border border-border bg-background"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={occurredOn}
              onChange={e => setOccurredOn(e.target.value)}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium mb-1">Tag (optional)</label>
            <select
              value={tagId}
              onChange={e => setTagId(e.target.value)}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            >
              <option value="">— None —</option>
              {(tags || []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ''}
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="What was done?"
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            />
          </div>

          {/* Targets */}
          <div>
            <label className="block text-sm font-medium mb-1">Applies to</label>
            <TargetPicker
              panelId={panelId}
              propertyId={propertyId}
              selected={targets}
              onChange={setTargets}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || targets.length === 0}
            className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
