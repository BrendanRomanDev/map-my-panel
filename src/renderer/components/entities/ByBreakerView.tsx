import { useBreakers } from '../../hooks/useBreakers'
import { useEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'

interface ByBreakerViewProps {
  panelId: string
}

export function ByBreakerView({ panelId }: ByBreakerViewProps) {
  const { data: breakers, isLoading: breakersLoading, error: breakersError } = useBreakers(panelId)
  const { data: entities, isLoading: entitiesLoading, error: entitiesError } = useEntities(panelId)

  const isLoading = breakersLoading || entitiesLoading
  const error = breakersError || entitiesError

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

  // Group entities by breaker
  const breakersWithEntities = breakers
    .map(breaker => ({
      breaker,
      entities: entities.filter(e => e.breaker_id === breaker.id)
    }))
    .filter(({ entities }) => entities.length > 0) // Only show breakers with entities

  if (breakersWithEntities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-muted-foreground mb-2">No mapped entities yet</div>
        <div className="text-sm text-muted-foreground">
          Assign entities to breakers to see them here
        </div>
      </div>
    )
  }

  return (
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
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
