import { useUnmappedEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'

interface UnmappedViewProps {
  panelId: string
}

export function UnmappedView({ panelId }: UnmappedViewProps) {
  const { data: entities, isLoading, error } = useUnmappedEntities(panelId)

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
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
        {entities.length} unmapped {entities.length === 1 ? 'entity' : 'entities'}
      </div>
      <div className="text-xs text-muted-foreground mb-4 px-1">
        These entities haven't been assigned to a breaker yet. Click on a breaker to assign them.
      </div>
      {entities.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  )
}
