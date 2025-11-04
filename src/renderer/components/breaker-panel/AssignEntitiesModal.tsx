import { useState, useMemo } from 'react'
import { useUnmappedEntities } from '../../hooks/useEntities'
import { useBreakers } from '../../hooks/useBreakers'
import { AddEntityModal } from '../entities/AddEntityModal'

interface AssignEntitiesModalProps {
  breakerId: string
  panelId: string
  isOpen: boolean
  onClose: () => void
  onAssign: (entityIds: string[]) => void
  currentLinkedBreakerId?: string | null
}

export function AssignEntitiesModal({ breakerId, panelId, isOpen, onClose, onAssign, currentLinkedBreakerId }: AssignEntitiesModalProps) {
  const { data: unmappedEntities } = useUnmappedEntities(panelId)
  const { data: breakers } = useBreakers(panelId)

  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [showAddEntityModal, setShowAddEntityModal] = useState(false)

  // Calculate initial breaker IDs for visual hint (include linked partner for double-pole)
  // Use current state from parent drawer if available, otherwise use stale breaker data
  const initialBreakerIds = useMemo(() => {
    const ids = [breakerId]

    // If parent provided current linked breaker state, use that (drawer hasn't been saved yet)
    if (currentLinkedBreakerId !== undefined) {
      if (currentLinkedBreakerId) {
        ids.push(currentLinkedBreakerId)
      }
    } else {
      // Otherwise fall back to fetched breaker data
      const currentBreaker = breakers?.find(b => b.id === breakerId)
      if (currentBreaker?.linked_breaker_id) {
        ids.push(currentBreaker.linked_breaker_id)
      }
    }

    return ids
  }, [breakers, breakerId, currentLinkedBreakerId])

  if (!isOpen) return null

  const handleToggleEntity = (entityId: string) => {
    const newSelected = new Set(selectedEntityIds)
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId)
    } else {
      newSelected.add(entityId)
    }
    setSelectedEntityIds(newSelected)
  }

  const handleAssign = () => {
    if (selectedEntityIds.size === 0) return

    // Pass selected entities to parent - parent will handle saving
    onAssign(Array.from(selectedEntityIds))
    setSelectedEntityIds(new Set())
  }

  const handleCancel = () => {
    setSelectedEntityIds(new Set())
    onClose()
  }

  const handleEntityCreated = (entityId: string) => {
    // Close the add entity modal - entity will appear in unmapped list
    setShowAddEntityModal(false)
    // Add the newly created entity to the existing selection (not replace)
    setSelectedEntityIds(prev => new Set([...prev, entityId]))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Assign Entities to Breaker</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select unmapped entities to assign to this breaker
            </p>
          </div>

          {/* Entity list */}
          <div className="flex-1 overflow-auto p-6">
            {/* Always show create button at top */}
            <button
              onClick={() => setShowAddEntityModal(true)}
              className="w-full px-4 py-2 mb-4 border-2 border-dashed border-border rounded-md hover:border-primary hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              + Create New Entity
            </button>

            {!unmappedEntities || unmappedEntities.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  No unmapped entities available
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {unmappedEntities.map(entity => (
                  <label
                    key={entity.id}
                    className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedEntityIds.has(entity.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEntityIds.has(entity.id)}
                      onChange={() => handleToggleEntity(entity.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{entity.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {entity.entity_type}
                        {entity.room && ` • ${entity.room}`}
                        {entity.location && ` • ${entity.location}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedEntityIds.size > 0 && (
                <span>{selectedEntityIds.size} {selectedEntityIds.size === 1 ? 'entity' : 'entities'} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedEntityIds.size === 0}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {`Assign ${selectedEntityIds.size > 0 ? `(${selectedEntityIds.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Entity Modal - breakers pre-checked for convenience, but entity created as unmapped */}
      <AddEntityModal
        panelId={panelId}
        isOpen={showAddEntityModal}
        onClose={() => setShowAddEntityModal(false)}
        initialBreakerIds={initialBreakerIds}
        createAsUnmapped={true}
        onEntityCreated={handleEntityCreated}
      />
    </>
  )
}
