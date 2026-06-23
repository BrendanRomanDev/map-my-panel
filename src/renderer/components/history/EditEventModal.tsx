import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TargetRef, HistoryEventWithDetails } from '@shared/types'
import { useEventTypes } from '../../hooks/useHistory'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TargetPicker } from './TargetPicker'

interface EditEventModalProps {
  event: HistoryEventWithDetails
  propertyId: string
  panelId: string
  onClose: () => void
}

function keyOf(t: { target_type: string; target_id: string }): string {
  return `${t.target_type}:${t.target_id}`
}

export function EditEventModal({ event, propertyId, panelId, onClose }: EditEventModalProps) {
  const queryClient = useQueryClient()
  const { data: eventTypes } = useEventTypes(propertyId)
  const { data: tags } = useTags(propertyId)

  const [eventTypeId, setEventTypeId] = useState<string>(event.event_type_id || '')
  const [occurredOn, setOccurredOn] = useState(event.occurred_on)
  const [tagId, setTagId] = useState<string>(event.tag_id || '')
  const [notes, setNotes] = useState(event.notes || '')
  const [targets, setTargets] = useState<TargetRef[]>(event.targets)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const originalTargetKeys = new Set(event.targets.map(keyOf))

  const invalidateAll = () => {
    // Refresh every target that was ever involved (old + new) + property
    const all = [...event.targets, ...targets]
    all.forEach(t =>
      queryClient.invalidateQueries({ queryKey: queryKeys.history.byTarget(t.target_type, t.target_id) })
    )
    queryClient.invalidateQueries({ queryKey: queryKeys.history.byProperty(propertyId) })
  }

  const handleSave = async () => {
    if (targets.length === 0) return
    setIsSaving(true)
    try {
      await window.electronAPI.history.updateEvent(event.id, {
        event_type_id: eventTypeId || null,
        notes: notes.trim() || null,
        occurred_on: occurredOn,
        tag_id: tagId || null
      })

      // Diff targets → add new, remove dropped
      const nextKeys = new Set(targets.map(keyOf))
      const toAdd = targets.filter(t => !originalTargetKeys.has(keyOf(t)))
      const toRemove = event.targets.filter(t => !nextKeys.has(keyOf(t)))

      if (toAdd.length > 0) {
        await window.electronAPI.history.addTargets(event.id, toAdd)
      }
      for (const t of toRemove) {
        await window.electronAPI.history.removeTarget(event.id, t.target_type, t.target_id)
      }

      invalidateAll()
      onClose()
    } catch (error) {
      console.error('Failed to update history event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    try {
      await window.electronAPI.history.deleteEvent(event.id)
      invalidateAll()
      onClose()
    } catch (error) {
      console.error('Failed to delete history event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-4">Edit History Event</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Event Type</label>
            <select
              value={eventTypeId}
              onChange={e => setEventTypeId(e.target.value)}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            >
              <option value="">— None —</option>
              {(eventTypes || []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={occurredOn}
              onChange={e => setOccurredOn(e.target.value)}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm px-2 py-2 rounded border border-border bg-background"
            />
          </div>

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

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm px-3 py-1.5 rounded text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
          <div className="flex gap-2">
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
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg p-6 max-w-sm w-full">
              <h4 className="text-base font-bold mb-2">Delete this event?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This removes the event from all {event.targets.length}{' '}
                {event.targets.length === 1 ? 'target' : 'targets'}. This can't be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm px-3 py-1.5 rounded bg-destructive text-destructive-foreground"
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
