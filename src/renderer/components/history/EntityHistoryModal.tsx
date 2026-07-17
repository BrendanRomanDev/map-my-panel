import { useQuery } from '@tanstack/react-query'
import type { Entity } from '@shared/types'
import { HistorySection } from './HistorySection'

interface EntityHistoryModalProps {
  entity: Entity
  onClose: () => void
}

// Standalone history viewer for a single entity, opened from its sidebar card.
export function EntityHistoryModal({ entity, onClose }: EntityHistoryModalProps) {
  const { data: panel } = useQuery({
    queryKey: ['panel', entity.panel_id],
    queryFn: () => window.electronAPI.panels.findById(entity.panel_id),
    enabled: !!entity.panel_id
  })

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
          <h3 className="text-lg font-bold">{entity.name} — History</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {panel && (
            <HistorySection
              targetType="entity"
              targetId={entity.id}
              propertyId={panel.property_id}
              panelId={entity.panel_id}
              targetLabel={entity.name}
            />
          )}
        </div>
      </div>
    </div>
  )
}
