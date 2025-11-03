import { useState } from 'react'
import { useEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface AllEntitiesViewProps {
  panelId: string
  mappedFilter?: 'all' | 'mapped' | 'unmapped'
  typeFilter?: string
  roomFilter?: string
}

export function AllEntitiesView({ panelId, mappedFilter = 'all', typeFilter = 'all', roomFilter = 'all' }: AllEntitiesViewProps) {
  const { data: allEntities, isLoading, error } = useEntities(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  // Filter entities by mapped status, type, and room
  const entities = allEntities?.filter(entity =>
    (mappedFilter === 'all' ||
     (mappedFilter === 'mapped' && entity.breaker_ids.length > 0) ||
     (mappedFilter === 'unmapped' && entity.breaker_ids.length === 0)) &&
    (typeFilter === 'all' || entity.entity_type === typeFilter) &&
    (roomFilter === 'all' || entity.room === roomFilter)
  )

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

  if (!entities || entities.length === 0) {
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
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
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
