import { useState } from 'react'
import type { Entity } from '@shared/types'
import { TagBadgeList } from '../tags/TagBadgeList'
import { EntityHistoryModal } from '../history/EntityHistoryModal'

interface EntityCardProps {
  entity: Entity
  onClick?: () => void
  onEdit?: () => void
  onHover?: (entityId: string | null) => void
  isSelected?: boolean
}

export function EntityCard({ entity, onClick, onEdit, onHover, isSelected }: EntityCardProps) {
  const [showHistory, setShowHistory] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.()
  }

  const handleHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowHistory(true)
  }

  const handleMouseEnter = () => {
    onHover?.(entity.id)
  }

  const handleMouseLeave = () => {
    onHover?.(null)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`p-3 border rounded-md transition-colors ${
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
          : 'border-border bg-background hover:bg-muted/50'
      } ${onClick ? 'cursor-pointer' : ''}`}
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
          <TagBadgeList targetType="entity" targetId={entity.id} />
        </div>
        <div className="flex items-start gap-2 flex-shrink-0">
          {entity.breaker_ids.length === 0 && (
            <div
              className="p-1 rounded text-yellow-600 dark:text-yellow-400"
              title="Not attached to any breaker"
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
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
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
          <button
            onClick={handleHistory}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View history"
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
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
        </div>
      </div>
      {showHistory && (
        <EntityHistoryModal entity={entity} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
