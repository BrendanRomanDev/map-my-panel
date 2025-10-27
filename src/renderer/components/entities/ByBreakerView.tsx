import { useState } from 'react'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface ByBreakerViewProps {
  panelId: string
  typeFilter?: string
  roomFilter?: string
}

export function ByBreakerView({ panelId, typeFilter = 'all', roomFilter = 'all' }: ByBreakerViewProps) {
  const { data: breakers, isLoading: breakersLoading, error: breakersError } = useBreakers(panelId)
  const { data: allEntities, isLoading: entitiesLoading, error: entitiesError } = useEntities(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  const isLoading = breakersLoading || entitiesLoading
  const error = breakersError || entitiesError

  // Filter entities by type and room
  const entities = allEntities?.filter(entity =>
    (typeFilter === 'all' || entity.entity_type === typeFilter) &&
    (roomFilter === 'all' || entity.room === roomFilter)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-destructive">
          Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!breakers || !entities) {
    return null
  }

  // Group entities by breaker, including unmapped
  const breakersWithEntities = breakers
    .map(breaker => ({
      breaker,
      entities: entities.filter(e => e.breaker_id === breaker.id)
    }))
    .filter(({ entities }) => entities.length > 0) // Only show breakers with entities

  // Get unmapped entities
  const unmappedEntities = entities.filter(e => e.breaker_id === null)

  if (breakersWithEntities.length === 0 && unmappedEntities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-muted-foreground mb-2">No entities yet</div>
        <div className="text-sm text-muted-foreground">
          Add entities to get started
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {breakersWithEntities.map(({ breaker, entities }) => (
          <div key={breaker.id}>
            <div className="text-sm font-semibold mb-2 px-1">
              <span className="text-muted-foreground">Position {breaker.position}</span>
              {breaker.label && <span className="ml-2">{breaker.label}</span>}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({breaker.amperage}A, {breaker.breaker_type === 'single-pole' ? 'Single' : 'Double'})
              </span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                • {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
              </span>
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

        {/* Unmapped entities section */}
        {unmappedEntities.length > 0 && (
          <div>
            <div className="text-sm font-semibold mb-2 px-1 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
              <span>Unmapped ({unmappedEntities.length})</span>
            </div>
            <div className="space-y-2">
              {unmappedEntities.map(entity => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  onEdit={() => setSelectedEntity(entity)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <EntityEditModal
        entity={selectedEntity}
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </>
  )
}
