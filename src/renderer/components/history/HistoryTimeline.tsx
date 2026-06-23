import type { HistoryEventWithDetails, RolledUpHistoryEvent } from '@shared/types'
import { TagBadge } from '../tags/TagBadge'

type TimelineEvent = HistoryEventWithDetails | RolledUpHistoryEvent

interface HistoryTimelineProps {
  events: TimelineEvent[]
  onSelect: (event: HistoryEventWithDetails) => void
  // Optional: summarize sibling targets ("↳ also: N other items") relative to
  // the viewed target. Omit for the global view (where every target matters).
  siblingSummary?: (event: TimelineEvent) => string | null
  emptyText?: string
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function yearOf(ymd: string): string {
  return ymd.split('-')[0] || '—'
}

function viaLabel(ev: TimelineEvent): string | null {
  const via = (ev as RolledUpHistoryEvent).via
  if (!via || via === 'direct') return null
  return via.entityName
}

// Presentational timeline: events grouped by year (newest first), each a
// clickable card. Shared by the breaker drawer, entity viewer, and global tab.
export function HistoryTimeline({
  events,
  onSelect,
  siblingSummary,
  emptyText = 'No history yet.'
}: HistoryTimelineProps) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>
  }

  const groups: { year: string; events: TimelineEvent[] }[] = []
  for (const ev of events) {
    const year = yearOf(ev.occurred_on)
    const last = groups[groups.length - 1]
    if (last && last.year === year) last.events.push(ev)
    else groups.push({ year, events: [ev] })
  }

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.year}>
          <div className="text-xs font-semibold text-muted-foreground mb-1">{group.year}</div>
          <div className="space-y-2">
            {group.events.map(ev => {
              const siblings = siblingSummary?.(ev) ?? null
              const via = viaLabel(ev)
              return (
                <button
                  key={ev.id}
                  onClick={() => onSelect(ev)}
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
                  {via && (
                    <div className="text-xs text-muted-foreground mt-0.5">via {via}</div>
                  )}
                  {ev.tag && (
                    <div className="mt-1">
                      <TagBadge tag={ev.tag} />
                    </div>
                  )}
                  {ev.notes && <div className="text-xs text-muted-foreground mt-1">{ev.notes}</div>}
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
  )
}
