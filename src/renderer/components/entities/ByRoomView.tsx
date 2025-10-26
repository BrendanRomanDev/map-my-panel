import { useEntitiesByRoom } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'

interface ByRoomViewProps {
  panelId: string
}

export function ByRoomView({ panelId }: ByRoomViewProps) {
  const { data: entitiesByRoom, isLoading, error } = useEntitiesByRoom(panelId)

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
    <div className="space-y-4">
      {entitiesByRoom.map(({ room, entities }) => (
        <div key={room || 'no-room'}>
          <div className="text-sm font-semibold mb-2 px-1">
            {room || 'No Room Assigned'} ({entities.length})
          </div>
          <div className="space-y-2">
            {entities.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
