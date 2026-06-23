import { useState } from 'react'
import type { TargetType, HistoryEventWithDetails } from '@shared/types'
import { useHistoryForTarget } from '../../hooks/useHistory'
import { TagBadge } from '../tags/TagBadge'
import { AddEventModal } from './AddEventModal'
import { EditEventModal } from './EditEventModal'

interface HistorySectionProps {
  targetType: TargetType
  targetId: string
  propertyId: string
  panelId: string
  // A human label for the current target, used to pre-fill the Add modal's
  // target list (e.g. "Breaker 12").
  targetLabel: string
}

// Formats a YYYY-MM-DD date string for display without timezone drift.
function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function yearOf(ymd: string): string {
  return ymd.split('-')[0] || '—'
}

export function HistorySection({
  targetType,
  targetId,
  propertyId,
  panelId,
  targetLabel
}: HistorySectionProps) {
  const { data: events } = useHistoryForTarget(targetType, targetId)
  const [isAdding, setIsAdding] = useState(false)
  const [editing, setEditing] = useState<HistoryEventWithDetails | null>(null)

  // Group events by year (they arrive newest-first already)
  const groups: { year: string; events: HistoryEventWithDetails[] }[] = []
  for (const ev of events || []) {
    const year = yearOf(ev.occurred_on)
    const last = groups[groups.length - 1]
    if (last && last.year === year) {
      last.events.push(ev)
    } else {
      groups.push({ year, events: [ev] })
    }
  }

  const siblingSummary = (ev: HistoryEventWithDetails): string | null => {
    const others = ev.targets.filter(
      t => !(t.target_type === targetType && t.target_id === targetId)
    )
    if (others.length === 0) return null
    return `${others.length} other ${others.length === 1 ? 'item' : 'items'}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">History</label>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          + Add Event
        </button>
      </div>

      {!events || events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No history yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group.year}>
              <div className="text-xs font-semibold text-muted-foreground mb-1">{group.year}</div>
              <div className="space-y-2">
                {group.events.map(ev => {
                  const siblings = siblingSummary(ev)
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setEditing(ev)}
                      className="w-full text-left p-2 border border-border rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {ev.tag?.icon ? `${ev.tag.icon} ` : ''}
                          {ev.event_type_name || ev.title || 'Event'}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(ev.occurred_on)}
                        </span>
                      </div>
                      {ev.tag && (
                        <div className="mt-1">
                          <TagBadge tag={ev.tag} />
                        </div>
                      )}
                      {ev.notes && (
                        <div className="text-xs text-muted-foreground mt-1">{ev.notes}</div>
                      )}
                      {siblings && (
                        <div className="text-xs text-muted-foreground mt-1">↳ also: {siblings}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <AddEventModal
          propertyId={propertyId}
          panelId={panelId}
          initialTarget={{ target_type: targetType, target_id: targetId, label: targetLabel }}
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
