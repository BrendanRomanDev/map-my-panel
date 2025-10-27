import { useState } from 'react'
import { useEntitiesByRoom } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface ByRoomViewProps {
  panelId: string
  typeFilter?: string
  roomFilter?: string
}

export function ByRoomView({ panelId, typeFilter = 'all', roomFilter = 'all' }: ByRoomViewProps) {
  const { data: allEntitiesByRoom, isLoading, error } = useEntitiesByRoom(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  // Filter entities by type and room, always include "Unassigned" group
  const entitiesByRoom = allEntitiesByRoom
    ?.filter(group => roomFilter === 'all' || group.room === roomFilter || (!group.room && roomFilter === 'all'))
    ?.map(group => ({
      room: group.room || 'Unassigned', // Label entities without a room as "Unassigned"
      entities: group.entities.filter(entity =>
        typeFilter === 'all' || entity.entity_type === typeFilter
      )
    })).filter(group => group.entities.length > 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading entities...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-destructive">
          Error loading entities: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!entitiesByRoom || entitiesByRoom.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-muted-foreground mb-2">No entities yet</div>
        <div className="text-sm text-muted-foreground">
          Add entities through the onboarding wizard or create them manually
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {entitiesByRoom.map(({ room, entities }) => (
          <div key={room || 'no-room'}>
            <div className="text-sm font-semibold mb-2 px-1 flex items-center gap-2">
              {room === 'Unassigned' && <span className="flex h-2 w-2 rounded-full bg-yellow-500" />}
              <span>{room} ({entities.length})</span>
            </div>
            <div className="space-y-2">
              {entities.map(entity => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  onEdit={() => setSelectedEntity(entity)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <EntityEditModal
        entity={selectedEntity}
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </>
  )
}
