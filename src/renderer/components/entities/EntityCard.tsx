import type { Entity } from '@shared/types'

interface EntityCardProps {
  entity: Entity
  onClick?: () => void
}

export function EntityCard({ entity, onClick }: EntityCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-3 border border-border rounded-md bg-background hover:bg-muted/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{entity.name}</div>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
              {entity.entity_type}
            </span>
            {entity.room && (
              <span className="ml-2 text-xs">📍 {entity.room}</span>
            )}
          </div>
          {entity.location && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {entity.location}
            </div>
          )}
        </div>
        {!entity.breaker_id && (
          <div className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Unmapped
          </div>
        )}
      </div>
    </div>
  )
}
