import { useQuery } from '@tanstack/react-query'
import type { BreakerWithEntityCount } from '@shared/types'
import { HistorySection } from './HistorySection'

interface BreakerHistoryModalProps {
  breaker: BreakerWithEntityCount
  onClose: () => void
}

// Standalone history viewer for a breaker, opened from its card. Shows the
// rolled-up history (direct breaker events + events on its assigned entities).
export function BreakerHistoryModal({ breaker, onClose }: BreakerHistoryModalProps) {
  const { data: panel } = useQuery({
    queryKey: ['panel', breaker.panel_id],
    queryFn: () => window.electronAPI.panels.findById(breaker.panel_id),
    enabled: !!breaker.panel_id
  })

  const label = `Breaker ${breaker.position}${breaker.position_slot || ''}${
    breaker.label ? ` — ${breaker.label}` : ''
  }`

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-border">
          <h3 className="text-lg font-bold">{label} — History</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {panel && (
            <HistorySection
              targetType="breaker"
              targetId={breaker.id}
              propertyId={panel.property_id}
              panelId={breaker.panel_id}
              targetLabel={label}
              // Linked (double-pole) breaker: pre-check the linked half so events
              // apply to both. Keyed off the link itself, not breaker_type, since
              // that's the source of truth for the pairing.
              extraInitialTargets={
                breaker.linked_breaker_id
                  ? [{ target_type: 'breaker', target_id: breaker.linked_breaker_id }]
                  : []
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
