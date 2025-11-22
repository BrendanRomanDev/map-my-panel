import { useState, useMemo, useEffect } from 'react'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntities } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface ByBreakerViewProps {
  panelId: string
  typeFilter?: string
  roomFilter?: string
  searchQuery?: string
  onToolbarReady?: (handlers: { expandAll: () => void; collapseAll: () => void; hasMultipleSections: boolean }) => void
  selectedEntityId?: string | null
  onEntitySelect?: (entityId: string | null) => void
  hoveredEntityId?: string | null
  onEntityHover?: (entityId: string | null) => void
}

export function ByBreakerView({ panelId, typeFilter = 'all', roomFilter = 'all', searchQuery = '', onToolbarReady, selectedEntityId, onEntitySelect, hoveredEntityId, onEntityHover }: ByBreakerViewProps) {
  const { data: breakers, isLoading: breakersLoading, error: breakersError } = useBreakers(panelId)
  const { data: allEntities, isLoading: entitiesLoading, error: entitiesError } = useEntities(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const isLoading = breakersLoading || entitiesLoading
  const error = breakersError || entitiesError

  // Helper function to calculate relevance score for search
  const calculateRelevance = (entity: Entity, query: string): number => {
    if (!query) return 0

    const lowerQuery = query.toLowerCase()
    let score = 0

    // Priority 1: Name match (score 3)
    if (entity.name.toLowerCase().includes(lowerQuery)) {
      score += 3
    }

    // Priority 2: Room match (score 2)
    if (entity.room && entity.room.toLowerCase().includes(lowerQuery)) {
      score += 2
    }

    // Priority 3: Location/description match (score 1)
    if (entity.location && entity.location.toLowerCase().includes(lowerQuery)) {
      score += 1
    }

    return score
  }

  // Filter entities by type, room, and search query
  const entities = useMemo(() => {
    if (!allEntities) return []

    return allEntities
      .filter(entity =>
        (typeFilter === 'all' || entity.entity_type === typeFilter) &&
        (roomFilter === 'all' || entity.room === roomFilter)
      )
      .map(entity => ({
        entity,
        relevance: calculateRelevance(entity, searchQuery)
      }))
      .filter(({ relevance }) => !searchQuery || relevance > 0) // Only show matches when searching
      .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
      .map(({ entity }) => entity)
  }, [allEntities, typeFilter, roomFilter, searchQuery])

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
  // Filter out container positions (they're just holders for tandem breakers)
  const breakersWithEntities = breakers
    .filter(breaker => !breaker.is_container) // Skip container positions
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

  // Auto-expand all sections when searching
  useEffect(() => {
    if (searchQuery) {
      setCollapsedSections(new Set())
    }
  }, [searchQuery])

  // Notify parent of toolbar handlers
  useEffect(() => {
    if (onToolbarReady) {
      const hasMultipleSections = ((unmappedEntities.length > 0 ? 1 : 0) + breakersWithEntities.length) > 1
      onToolbarReady({ expandAll, collapseAll, hasMultipleSections })
    }
  }, [unmappedEntities.length, breakersWithEntities.length, onToolbarReady])

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
                    isSelected={selectedEntityId === entity.id}
                    onClick={() => onEntitySelect?.(selectedEntityId === entity.id ? null : entity.id)}
                    onHover={onEntityHover}
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

                {breaker.label ? (
                  <span>
                    {breaker.position}
                    {breaker.position_slot && <span className="text-xs">{breaker.position_slot}</span>}
                    {' | '}{breaker.label} ({entities.length})
                  </span>
                ) : (
                  <span>
                    Position {breaker.position}
                    {breaker.position_slot && <span className="text-xs">{breaker.position_slot}</span>}
                    {' '}({entities.length})
                  </span>
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-2">
                  {entities.map(entity => (
                    <EntityCard
                      key={entity.id}
                      entity={entity}
                      isSelected={selectedEntityId === entity.id}
                      onClick={() => onEntitySelect?.(selectedEntityId === entity.id ? null : entity.id)}
                      onHover={onEntityHover}
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
