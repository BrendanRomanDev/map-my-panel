import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { EventType } from '@shared/types'
import { useEventTypes } from '../../hooks/useHistory'
import { queryKeys } from '../../lib/queryKeys'

interface EventTypeManagerProps {
  propertyId: string
}

export function EventTypeManager({ propertyId }: EventTypeManagerProps) {
  const queryClient = useQueryClient()
  const { data: eventTypes } = useEventTypes(propertyId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: EventType; usageCount: number } | null>(
    null
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.history.eventTypes(propertyId) })
  }

  const startEdit = (type: EventType) => {
    setEditingId(type.id)
    setIsCreating(false)
    setDraftName(type.name)
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setDraftName('')
  }

  const cancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setDraftName('')
  }

  const handleSave = async () => {
    const name = draftName.trim()
    if (!name) return
    if (isCreating) {
      await window.electronAPI.history.createEventType({ property_id: propertyId, name })
    } else if (editingId) {
      await window.electronAPI.history.updateEventType(editingId, { name })
    }
    invalidate()
    cancel()
  }

  const requestDelete = async (type: EventType) => {
    const usageCount = await window.electronAPI.history.countEventsForType(type.id)
    setDeleteTarget({ type, usageCount })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await window.electronAPI.history.deleteEventType(deleteTarget.type.id)
    invalidate()
    // Events keep their data but lose the type label — refresh timelines too.
    queryClient.invalidateQueries({ queryKey: queryKeys.history.all })
    setDeleteTarget(null)
  }

  const renderEditor = () => (
    <div className="flex items-center gap-2">
      <input
        value={draftName}
        onChange={e => setDraftName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
        }}
        placeholder="Event type name"
        className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={!draftName.trim()}
        className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
      >
        {isCreating ? 'Create' : 'Save'}
      </button>
      <button
        onClick={cancel}
        className="text-xs px-3 py-1 rounded border border-border hover:bg-muted"
      >
        Cancel
      </button>
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Manage Event Types</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Event types categorize history entries (e.g. Inspection, Outlet Change). Deleting a type
        keeps its events — they just lose the type label.
      </p>

      <div className="space-y-2">
        {(eventTypes || []).map(type =>
          editingId === type.id ? (
            <div key={type.id} className="p-2 border border-border rounded bg-muted/30">
              {renderEditor()}
            </div>
          ) : (
            <div
              key={type.id}
              className="flex items-center justify-between gap-2 p-2 border border-border rounded"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{type.name}</span>
                {type.property_id === null && (
                  <span className="text-xs text-muted-foreground">(global)</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(type)}
                  className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => requestDelete(type)}
                  className="text-xs px-2 py-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-3">
        {isCreating ? (
          <div className="p-2 border border-border rounded bg-muted/30">{renderEditor()}</div>
        ) : (
          <button
            onClick={startCreate}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
          >
            + Add Event Type
          </button>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Delete event type "{deleteTarget.type.name}"?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {deleteTarget.usageCount === 0
                ? 'No events currently use this type.'
                : `${deleteTarget.usageCount} ${
                    deleteTarget.usageCount === 1 ? 'event uses' : 'events use'
                  } this type. They'll be kept but shown without a type.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="text-sm px-3 py-1.5 rounded bg-destructive text-destructive-foreground"
              >
                Delete Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
