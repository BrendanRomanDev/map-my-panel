import type { Entity } from '@shared/types'

interface EntityCardProps {
  entity: Entity
  onClick?: () => void
  onEdit?: () => void
}

export function EntityCard({ entity, onClick, onEdit }: EntityCardProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.()
  }

  return (
    <div
      onClick={onClick}
      className={`p-3 border border-border rounded-md bg-background hover:bg-muted/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{entity.name}</div>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
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
        <div className="flex items-start gap-2 flex-shrink-0">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit entity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {entity.breaker_ids.length === 0 && (
            <div className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Unmapped
            </div>
          )}
          {entity.breaker_ids.length > 1 && (
            <div className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              {entity.breaker_ids.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
