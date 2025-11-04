import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntities } from '../../hooks/useEntities'
import { BreakerCard } from './BreakerCard'
import { BreakerDetailPanel } from './BreakerDetailPanel'
import type { Panel, BreakerWithEntityCount } from '@shared/types'

interface BreakerPanelGridProps {
  panelId: string
  highlightedEntityId?: string | null
}

export function BreakerPanelGrid({ panelId, highlightedEntityId }: BreakerPanelGridProps) {
  const queryClient = useQueryClient()

  // Query for panel data
  const { data: panel } = useQuery({
    queryKey: ['panel', panelId],
    queryFn: () => window.electronAPI.panels.findById(panelId),
    enabled: !!panelId
  })

  const { data: breakers, isLoading, error } = useBreakers(panelId)
  const { data: entities } = useEntities(panelId)
  const [selectedBreaker, setSelectedBreaker] = useState<BreakerWithEntityCount | null>(null)
  const [expandedTandems, setExpandedTandems] = useState<Set<number>>(new Set())
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null)
  const [hoveredBreakerId, setHoveredBreakerId] = useState<string | null>(null)

  // Read the setting from localStorage
  const showRoomsOnBreakers = localStorage.getItem('showRoomsOnBreakers') === 'true'

  // Get highlighted breaker IDs from entity hover + breaker hover
  const highlightedBreakerIds = useMemo(() => {
    const ids = new Set<string>()

    // Add breakers from highlighted entity
    if (highlightedEntityId && entities) {
      const entity = entities.find(e => e.id === highlightedEntityId)
      if (entity) {
        entity.breaker_ids.forEach(id => ids.add(id))
      }
    }

    // Add breakers from breaker hover (the hovered breaker + its linked breaker)
    if (hoveredBreakerId && breakers) {
      ids.add(hoveredBreakerId)
      const hoveredBreaker = breakers.find(b => b.id === hoveredBreakerId)
      if (hoveredBreaker?.linked_breaker_id) {
        ids.add(hoveredBreaker.linked_breaker_id)
      }
    }

    return ids
  }, [highlightedEntityId, entities, hoveredBreakerId, breakers])

  // Calculate rooms for each breaker
  const breakerRooms = useMemo(() => {
    if (!entities || !showRoomsOnBreakers) return new Map<string, string[]>()

    const roomsMap = new Map<string, Set<string>>()

    entities.forEach(entity => {
      // Only include entities with rooms
      if (!entity.room || entity.room.trim() === '') return

      // Add room to each breaker this entity is assigned to
      entity.breaker_ids.forEach(breakerId => {
        if (!roomsMap.has(breakerId)) {
          roomsMap.set(breakerId, new Set())
        }
        roomsMap.get(breakerId)!.add(entity.room)
      })
    })

    // Convert sets to sorted arrays
    const result = new Map<string, string[]>()
    roomsMap.forEach((roomSet, breakerId) => {
      result.set(breakerId, Array.from(roomSet).sort())
    })

    return result
  }, [entities, showRoomsOnBreakers])

  // Early return if panel is loading
  if (!panel) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading panel...</div>
      </div>
    )
  }

  const handlePowerToggle = async (breakerId: string, isPowered: boolean) => {
    try {
      // Find the breaker being toggled
      const breaker = breakers?.find(b => b.id === breakerId)

      // Update the breaker
      await window.electronAPI.breakers.update(breakerId, {
        is_powered: isPowered
      })

      // If this breaker is linked to another, update the linked breaker too
      if (breaker?.linked_breaker_id) {
        await window.electronAPI.breakers.update(breaker.linked_breaker_id, {
          is_powered: isPowered
        })
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['breakers', panelId] })
    } catch (error) {
      console.error('Failed to toggle breaker power:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading panel...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">
          Error loading panel: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!breakers || breakers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">No breakers in this panel</div>
      </div>
    )
  }

  // Group breakers by position for layout
  const breakersByPosition = new Map<number, BreakerWithEntityCount[]>()
  breakers.forEach(breaker => {
    if (!breakersByPosition.has(breaker.position)) {
      breakersByPosition.set(breaker.position, [])
    }
    breakersByPosition.get(breaker.position)!.push(breaker)
  })

  // Sort breakers within each position: main (no slot) first, then 'a', then 'b'
  breakersByPosition.forEach((breakers, position) => {
    breakers.sort((a, b) => {
      // No slot (main breaker) comes first
      if (!a.position_slot && b.position_slot) return -1
      if (a.position_slot && !b.position_slot) return 1
      // Then sort by slot letter
      if (a.position_slot && b.position_slot) {
        return a.position_slot.localeCompare(b.position_slot)
      }
      return 0
    })
  })

  const toggleTandem = (position: number) => {
    setExpandedTandems(prev => {
      const next = new Set(prev)
      const isExpanding = !next.has(position)

      if (isExpanding) {
        next.add(position)

        // Auto-expand linked tandem positions
        const positionBreakers = breakersByPosition.get(position) || []
        positionBreakers.forEach(breaker => {
          if (breaker.linked_breaker_id) {
            const linkedBreaker = breakers?.find(b => b.id === breaker.linked_breaker_id)
            if (linkedBreaker && linkedBreaker.position !== position) {
              // Check if linked breaker's position has tandems
              const linkedPositionBreakers = breakersByPosition.get(linkedBreaker.position) || []
              if (linkedPositionBreakers.some(b => b.position_slot)) {
                next.add(linkedBreaker.position)
              }
            }
          }
        })
      } else {
        next.delete(position)

        // Auto-collapse linked tandem positions
        const positionBreakers = breakersByPosition.get(position) || []
        positionBreakers.forEach(breaker => {
          if (breaker.linked_breaker_id) {
            const linkedBreaker = breakers?.find(b => b.id === breaker.linked_breaker_id)
            if (linkedBreaker && linkedBreaker.position !== position) {
              // Check if linked breaker's position has tandems
              const linkedPositionBreakers = breakersByPosition.get(linkedBreaker.position) || []
              if (linkedPositionBreakers.some(b => b.position_slot)) {
                next.delete(linkedBreaker.position)
              }
            }
          }
        })
      }

      return next
    })
  }

  // Helper to check if a position should be highlighted by hover
  // Returns true if position is directly hovered OR linked to hovered position
  const isPositionHovered = (position: number): boolean => {
    if (!hoveredPosition) return false
    if (hoveredPosition === position) return true

    // Check if this position is linked to the hovered position
    const positionBreakers = breakersByPosition.get(position) || []
    const hoveredPositionBreakers = breakersByPosition.get(hoveredPosition) || []

    return positionBreakers.some(breaker => {
      if (!breaker.linked_breaker_id) return false
      return hoveredPositionBreakers.some(hb => hb.id === breaker.linked_breaker_id)
    })
  }

  // Helper to get linked relationship badge text for a position
  const getLinkedRelationship = (position: number, tandemBreakers: BreakerWithEntityCount[]): string | null => {
    for (const breaker of tandemBreakers) {
      if (breaker.linked_breaker_id) {
        const linkedBreaker = breakers?.find(b => b.id === breaker.linked_breaker_id)
        if (linkedBreaker && linkedBreaker.position !== position) {
          // Format: "17B → 19A"
          return `${breaker.position}${breaker.position_slot || ''} ↔ ${linkedBreaker.position}${linkedBreaker.position_slot || ''}`
        }
      }
    }
    return null
  }

  // Calculate number of rows (each row has 2 positions - left and right)
  const numRows = Math.ceil(panel.total_positions / 2)

  // Circuit statistics
  const totalCircuits = breakers.length
  const activeCircuits = breakers.filter(b => b.status === 'active').length
  const spareCircuits = breakers.filter(b => b.status === 'spare').length
  const poweredOnCircuits = breakers.filter(b => b.is_powered).length
  const poweredOffCircuits = breakers.filter(b => !b.is_powered).length

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div>
        <h2 className="text-2xl font-bold">{panel.name}</h2>
        <div className="text-lg font-semibold text-muted-foreground">
          {panel.main_breaker_amperage}A Panel
        </div>
      </div>

      {/* Metadata section */}
      <div className="text-sm text-muted-foreground">
        {panel.total_positions} positions • {totalCircuits} {totalCircuits === 1 ? 'circuit' : 'circuits'} • {activeCircuits} active • {spareCircuits} spare • {poweredOnCircuits} on • {poweredOffCircuits} off
      </div>

      {/* Panel grid */}
      <div className="border border-border rounded-lg p-6 bg-muted/10">
        <div className="space-y-2">
          {Array.from({ length: numRows }, (_, rowIndex) => {
            const leftPosition = rowIndex * 2 + 1
            const rightPosition = rowIndex * 2 + 2

            const leftBreakers = breakersByPosition.get(leftPosition) || []
            const rightBreakers = breakersByPosition.get(rightPosition) || []

            return (
              <div key={rowIndex} className="grid grid-cols-2 gap-4">
                {/* Left side */}
                <div className="space-y-1">
                  {leftBreakers.length > 0 ? (
                    (() => {
                      const hasTandem = leftBreakers.some(b => b.position_slot)
                      const isExpanded = expandedTandems.has(leftPosition)
                      const baseBreaker = leftBreakers.find(b => !b.position_slot)
                      const tandemBreakers = leftBreakers.filter(b => b.position_slot)

                      if (hasTandem && baseBreaker) {
                        // Tandem breaker with base position
                        const entityCount = leftBreakers.reduce((sum, b) => sum + b.entity_count, 0)
                        const allRooms = new Set<string>()
                        leftBreakers.forEach(b => {
                          const rooms = breakerRooms.get(b.id)
                          rooms?.forEach(r => allRooms.add(r))
                        })

                        // Get linked relationship text
                        const linkedRelationship = getLinkedRelationship(leftPosition, tandemBreakers)

                        return (
                          <>
                            {/* Base position - always visible, acts as toggle */}
                            <button
                              onClick={() => toggleTandem(leftPosition)}
                              onMouseEnter={() => setHoveredPosition(leftPosition)}
                              onMouseLeave={() => setHoveredPosition(null)}
                              className={`w-full p-3 border-2 rounded transition-all text-left ${
                                (!isExpanded && tandemBreakers.some(b => highlightedBreakerIds.has(b.id))) || isPositionHovered(leftPosition)
                                  ? 'border-primary bg-primary/30 ring-4 ring-primary/50 shadow-xl scale-[1.02]'
                                  : 'border-accent/50 bg-accent/5 hover:bg-accent/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-medium">{leftPosition}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                                      Tandem ({tandemBreakers.length})
                                    </span>
                                    {linkedRelationship && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground inline-flex items-center gap-1">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="10"
                                          height="10"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                        {linkedRelationship}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
                                    {allRooms.size > 0 && ` • ${allRooms.size} ${allRooms.size === 1 ? 'room' : 'rooms'}`}
                                  </div>
                                </div>
                                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Tandem breakers - shown when expanded */}
                            {isExpanded && tandemBreakers.map(breaker => (
                              <div key={breaker.id} className="ml-4">
                                <BreakerCard
                                  breaker={breaker}
                                  allBreakers={breakers}
                                  rooms={breakerRooms.get(breaker.id)}
                                  isHighlighted={highlightedBreakerIds.has(breaker.id)}
                                  onClick={() => setSelectedBreaker(breaker)}
                                  onPowerToggle={handlePowerToggle}
                                  onHover={setHoveredBreakerId}
                                />
                              </div>
                            ))}
                          </>
                        )
                      }

                      // Regular breaker view (no tandem)
                      return leftBreakers.map(breaker => (
                        <BreakerCard
                          key={breaker.id}
                          breaker={breaker}
                          allBreakers={breakers}
                          rooms={breakerRooms.get(breaker.id)}
                          isHighlighted={highlightedBreakerIds.has(breaker.id)}
                          onClick={() => setSelectedBreaker(breaker)}
                          onPowerToggle={handlePowerToggle}
                          onHover={setHoveredBreakerId}
                        />
                      ))
                    })()
                  ) : (
                    <div className="p-3 border border-dashed border-muted rounded text-center text-sm text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="space-y-1">
                  {rightBreakers.length > 0 ? (
                    (() => {
                      const hasTandem = rightBreakers.some(b => b.position_slot)
                      const isExpanded = expandedTandems.has(rightPosition)
                      const baseBreaker = rightBreakers.find(b => !b.position_slot)
                      const tandemBreakers = rightBreakers.filter(b => b.position_slot)

                      if (hasTandem && baseBreaker) {
                        // Tandem breaker with base position
                        const entityCount = rightBreakers.reduce((sum, b) => sum + b.entity_count, 0)
                        const allRooms = new Set<string>()
                        rightBreakers.forEach(b => {
                          const rooms = breakerRooms.get(b.id)
                          rooms?.forEach(r => allRooms.add(r))
                        })

                        // Get linked relationship text
                        const linkedRelationship = getLinkedRelationship(rightPosition, tandemBreakers)

                        return (
                          <>
                            {/* Base position - always visible, acts as toggle */}
                            <button
                              onClick={() => toggleTandem(rightPosition)}
                              onMouseEnter={() => setHoveredPosition(rightPosition)}
                              onMouseLeave={() => setHoveredPosition(null)}
                              className={`w-full p-3 border-2 rounded transition-all text-left ${
                                (!isExpanded && tandemBreakers.some(b => highlightedBreakerIds.has(b.id))) || isPositionHovered(rightPosition)
                                  ? 'border-primary bg-primary/30 ring-4 ring-primary/50 shadow-xl scale-[1.02]'
                                  : 'border-accent/50 bg-accent/5 hover:bg-accent/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-medium">{rightPosition}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                                      Tandem ({tandemBreakers.length})
                                    </span>
                                    {linkedRelationship && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground inline-flex items-center gap-1">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="10"
                                          height="10"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                        {linkedRelationship}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
                                    {allRooms.size > 0 && ` • ${allRooms.size} ${allRooms.size === 1 ? 'room' : 'rooms'}`}
                                  </div>
                                </div>
                                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Tandem breakers - shown when expanded */}
                            {isExpanded && tandemBreakers.map(breaker => (
                              <div key={breaker.id} className="ml-4">
                                <BreakerCard
                                  breaker={breaker}
                                  allBreakers={breakers}
                                  rooms={breakerRooms.get(breaker.id)}
                                  isHighlighted={highlightedBreakerIds.has(breaker.id)}
                                  onClick={() => setSelectedBreaker(breaker)}
                                  onPowerToggle={handlePowerToggle}
                                  onHover={setHoveredBreakerId}
                                />
                              </div>
                            ))}
                          </>
                        )
                      }

                      // Regular breaker view (no tandem)
                      return rightBreakers.map(breaker => (
                        <BreakerCard
                          key={breaker.id}
                          breaker={breaker}
                          allBreakers={breakers}
                          rooms={breakerRooms.get(breaker.id)}
                          isHighlighted={highlightedBreakerIds.has(breaker.id)}
                          onClick={() => setSelectedBreaker(breaker)}
                          onPowerToggle={handlePowerToggle}
                          onHover={setHoveredBreakerId}
                        />
                      ))
                    })()
                  ) : (
                    <div className="p-3 border border-dashed border-muted rounded text-center text-sm text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Active with entities</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Active (no entities)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span>Spare / OFF</span>
        </div>
      </div>

      {/* Breaker detail panel */}
      <BreakerDetailPanel
        breaker={selectedBreaker}
        panelId={panel.id}
        onClose={() => setSelectedBreaker(null)}
      />
    </div>
  )
}
