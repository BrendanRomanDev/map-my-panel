import { useState } from 'react'
import type { TargetType, TargetRef, HistoryEventWithDetails } from '@shared/types'
import { useHistoryForTarget, useBreakerHistoryRollup } from '../../hooks/useHistory'
import { HistoryTimeline } from './HistoryTimeline'
import { AddEventModal } from './AddEventModal'
import { EditEventModal } from './EditEventModal'

interface HistorySectionProps {
  targetType: TargetType
  targetId: string
  propertyId: string
  panelId: string
  // Human label for the current target, pre-fills the Add modal target list.
  targetLabel: string
  // Extra targets to pre-check when adding an event (besides this target).
  // Used for double-pole breakers to pre-check the linked half.
  extraInitialTargets?: TargetRef[]
  // Compact mode (drawer): cap the list and show a "View full history" link.
  compact?: boolean
  onViewFull?: () => void
}

export function HistorySection({
  targetType,
  targetId,
  propertyId,
  panelId,
  targetLabel,
  extraInitialTargets = [],
  compact = false,
  onViewFull
}: HistorySectionProps) {
  // Breakers roll up their assigned entities' events; others list directly.
  const rollup = useBreakerHistoryRollup(targetType === 'breaker' ? targetId : null)
  const direct = useHistoryForTarget(targetType !== 'breaker' ? targetType : ('breaker' as TargetType), targetId)
  const events = (targetType === 'breaker' ? rollup.data : direct.data) || []

  const [isAdding, setIsAdding] = useState(false)
  const [editing, setEditing] = useState<HistoryEventWithDetails | null>(null)

  const COMPACT_LIMIT = 3
  const shown = compact ? events.slice(0, COMPACT_LIMIT) : events
  const hiddenCount = events.length - shown.length

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

      <HistoryTimeline events={shown} onSelect={setEditing} siblingSummary={siblingSummary} />

      {compact && (hiddenCount > 0 || events.length > 0) && onViewFull && (
        <button
          onClick={onViewFull}
          className="mt-2 text-xs text-primary hover:underline"
        >
          View full history{hiddenCount > 0 ? ` (${hiddenCount} more)` : ''} →
        </button>
      )}

      {isAdding && (
        <AddEventModal
          propertyId={propertyId}
          panelId={panelId}
          initialTargets={[{ target_type: targetType, target_id: targetId }, ...extraInitialTargets]}
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
