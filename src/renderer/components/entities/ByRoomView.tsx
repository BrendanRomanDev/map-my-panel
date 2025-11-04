import { useState, useMemo, useEffect } from 'react'
import { useEntitiesByRoom } from '../../hooks/useEntities'
import { EntityCard } from './EntityCard'
import { EntityEditModal } from './EntityEditModal'
import type { Entity } from '@shared/types'

interface ByRoomViewProps {
  panelId: string
  typeFilter?: string
  roomFilter?: string
  searchQuery?: string
}

export function ByRoomView({ panelId, typeFilter = 'all', roomFilter = 'all', searchQuery = '' }: ByRoomViewProps) {
  const { data: allEntitiesByRoom, isLoading, error } = useEntitiesByRoom(panelId)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

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
  const entitiesByRoom = useMemo(() => {
    let groups = allEntitiesByRoom
      ?.filter(group => roomFilter === 'all' || group.room === roomFilter || (!group.room && roomFilter === 'all'))
      ?.map(group => ({
        room: group.room || 'Unassigned', // Label entities without a room as "Unassigned"
        entities: group.entities
          .filter(entity => typeFilter === 'all' || entity.entity_type === typeFilter)
          .map(entity => ({
            entity,
            relevance: calculateRelevance(entity, searchQuery)
          }))
          .filter(({ relevance }) => !searchQuery || relevance > 0) // Only show matches when searching
          .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
          .map(({ entity }) => entity)
      }))
      .filter(group => group.entities.length > 0)

    return groups || []
  }, [allEntitiesByRoom, typeFilter, roomFilter, searchQuery])

  // Get all section IDs for collapse/expand all
  const allSectionIds = useMemo(() =>
    entitiesByRoom?.map(({ room }) => room) || [],
    [entitiesByRoom]
  )

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

  if (!entitiesByRoom || entitiesByRoom.length === 0) {
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
      {/* Collapse/Expand toolbar - top right corner */}
      {entitiesByRoom && entitiesByRoom.length > 1 && (
        <div className="flex gap-1 mb-3 justify-end">
          <button
            onClick={expandAll}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Expand all sections"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={collapseAll}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Collapse all sections"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}

      <div className="space-y-4">
        {entitiesByRoom?.map(({ room, entities }) => {
          const isCollapsed = collapsedSections.has(room)

          return (
            <div key={room || 'no-room'}>
              <button
                onClick={() => toggleSection(room)}
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

                {room === 'Unassigned' && <span className="flex h-2 w-2 rounded-full bg-yellow-500" />}
                <span>{room} ({entities.length})</span>
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
