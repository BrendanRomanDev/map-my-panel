import { useState } from 'react'
import { useUnmappedEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface UnmappedViewProps {
  panelId: string
  typeFilter?: string
  roomFilter?: string
}

export function UnmappedView({ panelId, typeFilter = 'all', roomFilter = 'all' }: UnmappedViewProps) {
  const { data: allEntities, isLoading, error } = useUnmappedEntities(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  // Filter entities by type and room
  const entities = allEntities?.filter(entity =>
    (typeFilter === 'all' || entity.entity_type === typeFilter) &&
    (roomFilter === 'all' || entity.room === roomFilter)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading unmapped entities...</div>
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

  if (!entities || entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-lg mb-2">🎉</div>
        <div className="text-muted-foreground mb-2">All entities are mapped!</div>
        <div className="text-sm text-muted-foreground">
          Every entity has been assigned to a breaker
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
          {entities.length} unmapped {entities.length === 1 ? 'entity' : 'entities'}
        </div>
        <div className="text-xs text-muted-foreground mb-4 px-1">
          These entities haven't been assigned to a breaker yet. Click on a breaker to assign them.
        </div>
        {entities.map(entity => (
          <EntityCard
            key={entity.id}
            entity={entity}
            onEdit={() => setSelectedEntity(entity)}
          />
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
