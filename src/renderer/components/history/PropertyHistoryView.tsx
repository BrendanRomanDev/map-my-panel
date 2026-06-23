import { useState } from 'react'
import type { HistoryEventWithDetails } from '@shared/types'
import { useHistoryForProperty, useEventTypes } from '../../hooks/useHistory'
import { useTags } from '../../hooks/useTags'
import { HistoryTimeline } from './HistoryTimeline'
import { AddEventModal } from './AddEventModal'
import { EditEventModal } from './EditEventModal'

interface PropertyHistoryViewProps {
  propertyId: string
  panelId: string
}

// Top-level global history: every event across the property, filterable, with
// an Add Event entry point that can span targets across breakers (or none =
// a standalone whole-property note).
export function PropertyHistoryView({ propertyId, panelId }: PropertyHistoryViewProps) {
  const { data: events } = useHistoryForProperty(propertyId)
  const { data: eventTypes } = useEventTypes(propertyId)
  const { data: tags } = useTags(propertyId)

  const [typeFilter, setTypeFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editing, setEditing] = useState<HistoryEventWithDetails | null>(null)

  const q = search.trim().toLowerCase()
  const filtered = (events || []).filter(ev => {
    if (typeFilter && ev.event_type_id !== typeFilter) return false
    if (tagFilter && ev.tag_id !== tagFilter) return false
    if (q) {
      const hay = `${ev.title || ''} ${ev.notes || ''} ${ev.event_type_name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const targetSummary = (ev: HistoryEventWithDetails): string | null => {
    if (ev.targets.length === 0) return null
    const t = ev.targets[0]
    const label = t.target_type === 'property' ? 'whole property' : `${ev.targets.length} ${ev.targets.length === 1 ? 'item' : 'items'}`
    return label
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Property History</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground"
        >
          + Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border border-border bg-background"
        >
          <option value="">All types</option>
          {(eventTypes || []).map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border border-border bg-background"
        >
          <option value="">All tags</option>
          {(tags || []).map(t => (
            <option key={t.id} value={t.id}>
              {t.icon ? `${t.icon} ` : ''}
              {t.name}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 min-w-[8rem] text-sm px-2 py-1.5 rounded border border-border bg-background"
        />
      </div>

      <HistoryTimeline
        events={filtered}
        onSelect={setEditing}
        siblingSummary={targetSummary}
        emptyText={
          events && events.length > 0 ? 'No events match your filters.' : 'No history yet.'
        }
      />

      {isAdding && (
        <AddEventModal
          propertyId={propertyId}
          panelId={panelId}
          // No pre-checked target — defaults to a standalone property note
          initialTarget={{ target_type: 'property', target_id: propertyId, label: 'Whole property' }}
          onClose={() => setIsAdding(false)}
        />
      )}

      {editing && (
        <EditEventModal
          event={editing}
          propertyId={propertyId}
          panelId={panelId}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
