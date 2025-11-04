import { useState, useMemo } from 'react'
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

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
      entities: entities.filter(e => e.breaker_ids.includes(breaker.id))
    }))
    .filter(({ entities }) => entities.length > 0) // Only show breakers with entities

  // Get unmapped entities
  const unmappedEntities = entities.filter(e => e.breaker_ids.length === 0)

  // Get all section IDs for collapse/expand all
  const allSectionIds = useMemo(() => {
    const ids: string[] = []
    if (unmappedEntities.length > 0) ids.push('unmapped')
    breakersWithEntities.forEach(({ breaker }) => ids.push(breaker.id))
    return ids
  }, [unmappedEntities.length, breakersWithEntities])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const collapseAll = () => {
    setCollapsedSections(new Set(allSectionIds))
  }

  const expandAll = () => {
    setCollapsedSections(new Set())
  }

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
      {/* Collapse/Expand toolbar */}
      {((unmappedEntities.length > 0 ? 1 : 0) + breakersWithEntities.length) > 1 && (
        <div className="flex gap-2 mb-3 px-1">
          <button
            onClick={expandAll}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
          >
            Collapse All
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Unmapped entities section - shown at top */}
        {unmappedEntities.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('unmapped')}
              className="w-full text-sm font-semibold mb-2 px-1 flex items-center gap-2 hover:text-primary transition-colors text-left"
            >
              {/* Chevron icon */}
              <svg
                className={`w-4 h-4 transition-transform ${collapsedSections.has('unmapped') ? '' : 'rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>

              <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
              <span>Unmapped ({unmappedEntities.length})</span>
            </button>

            {!collapsedSections.has('unmapped') && (
              <div className="space-y-2">
                {unmappedEntities.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    onEdit={() => setSelectedEntity(entity)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {breakersWithEntities.map(({ breaker, entities }) => {
          const isCollapsed = collapsedSections.has(breaker.id)

          return (
            <div key={breaker.id}>
              <button
                onClick={() => toggleSection(breaker.id)}
                className="w-full text-sm font-semibold mb-2 px-1 flex items-center gap-2 hover:text-primary transition-colors text-left"
              >
                {/* Chevron icon */}
                <svg
                  className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                <span className="text-muted-foreground">Position {breaker.position}</span>
                {breaker.label && <span className="ml-2">{breaker.label}</span>}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({breaker.amperage}A, {breaker.breaker_type === 'single-pole' ? 'Single' : 'Double'})
                </span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  • {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-2">
                  {entities.map(entity => (
                    <EntityCard
                      key={entity.id}
                      entity={entity}
                      onEdit={() => setSelectedEntity(entity)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <EntityEditModal
        entity={selectedEntity}
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </>
  )
}
