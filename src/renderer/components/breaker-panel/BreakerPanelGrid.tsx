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

  // Read the setting from localStorage
  const showRoomsOnBreakers = localStorage.getItem('showRoomsOnBreakers') === 'true'

  // Get highlighted entity's breaker IDs
  const highlightedBreakerIds = useMemo(() => {
    if (!highlightedEntityId || !entities) return new Set<string>()

    const entity = entities.find(e => e.id === highlightedEntityId)
    return entity ? new Set(entity.breaker_ids) : new Set<string>()
  }, [highlightedEntityId, entities])

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
                    leftBreakers.map(breaker => (
                      <div
                        key={breaker.id}
                        className={breaker.position_slot ? 'ml-4' : ''}
                      >
                        <BreakerCard
                          breaker={breaker}
                          allBreakers={breakers}
                          rooms={breakerRooms.get(breaker.id)}
                          isHighlighted={highlightedBreakerIds.has(breaker.id)}
                          onClick={() => setSelectedBreaker(breaker)}
                          onPowerToggle={handlePowerToggle}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="p-3 border border-dashed border-muted rounded text-center text-sm text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="space-y-1">
                  {rightBreakers.length > 0 ? (
                    rightBreakers.map(breaker => (
                      <div
                        key={breaker.id}
                        className={breaker.position_slot ? 'ml-4' : ''}
                      >
                        <BreakerCard
                          breaker={breaker}
                          allBreakers={breakers}
                          rooms={breakerRooms.get(breaker.id)}
                          isHighlighted={highlightedBreakerIds.has(breaker.id)}
                          onClick={() => setSelectedBreaker(breaker)}
                          onPowerToggle={handlePowerToggle}
                        />
                      </div>
                    ))
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
