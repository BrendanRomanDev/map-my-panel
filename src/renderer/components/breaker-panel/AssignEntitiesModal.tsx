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
}

export function AssignEntitiesModal({ breakerId, panelId, isOpen, onClose, onAssign }: AssignEntitiesModalProps) {
  const { data: unmappedEntities } = useUnmappedEntities(panelId)
  const { data: breakers } = useBreakers(panelId)

  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [showAddEntityModal, setShowAddEntityModal] = useState(false)

  // Calculate initial breaker IDs for new entities (include linked partner for double-pole)
  const initialBreakerIds = useMemo(() => {
    const currentBreaker = breakers?.find(b => b.id === breakerId)
    if (!currentBreaker) return [breakerId]

    const ids = [breakerId]
    if (currentBreaker.linked_breaker_id) {
      ids.push(currentBreaker.linked_breaker_id)
    }
    return ids
  }, [breakers, breakerId])

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

  const handleEntityCreated = (wasAssignedToBreakers: boolean) => {
    // Close the add entity modal
    setShowAddEntityModal(false)

    // If entity was assigned to breakers, close this modal too (job done!)
    // If entity was unmapped, stay in this modal so user can assign it
    if (wasAssignedToBreakers) {
      onClose()
    }
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
            {!unmappedEntities || unmappedEntities.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  No unmapped entities available
                </div>
                <button
                  onClick={() => setShowAddEntityModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  + Create New Entity
                </button>
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

      {/* Add Entity Modal */}
      <AddEntityModal
        panelId={panelId}
        isOpen={showAddEntityModal}
        onClose={() => setShowAddEntityModal(false)}
        initialBreakerIds={initialBreakerIds}
        onEntityCreated={handleEntityCreated}
      />
    </>
  )
}
