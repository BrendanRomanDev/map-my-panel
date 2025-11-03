import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBreakers } from '../../hooks/useBreakers'
import { BreakerCard } from './BreakerCard'
import { BreakerDetailPanel } from './BreakerDetailPanel'
import type { Panel, BreakerWithEntityCount } from '@shared/types'

interface BreakerPanelGridProps {
  panel: Panel
}

export function BreakerPanelGrid({ panel }: BreakerPanelGridProps) {
  const queryClient = useQueryClient()
  const { data: breakers, isLoading, error } = useBreakers(panel.id)
  const [selectedBreaker, setSelectedBreaker] = useState<BreakerWithEntityCount | null>(null)

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
      queryClient.invalidateQueries({ queryKey: ['breakers', panel.id] })
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

  // Calculate total amperage used (only active AND powered breakers)
  const totalAmperage = breakers
    .filter(b => b.status === 'active' && b.is_powered)
    .reduce((sum, b) => sum + b.amperage, 0)

  // Calculate sum of ALL breakers (informational only - oversubscription is normal)
  const sumOfAllBreakers = breakers.reduce((sum, b) => sum + b.amperage, 0)

  // Circuit statistics
  const totalCircuits = breakers.length
  const activeCircuits = breakers.filter(b => b.status === 'active').length
  const spareCircuits = breakers.filter(b => b.status === 'spare').length
  const poweredOnCircuits = breakers.filter(b => b.is_powered).length
  const poweredOffCircuits = breakers.filter(b => !b.is_powered).length

  const usagePercent = Math.round((totalAmperage / panel.main_breaker_amperage) * 100)

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div>
        <h2 className="text-2xl font-bold">{panel.name}</h2>
        <div className="text-lg font-semibold text-muted-foreground">
          {totalAmperage}A / {panel.main_breaker_amperage}A
        </div>
      </div>

      {/* Metadata section */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {panel.total_positions} positions • {totalCircuits} {totalCircuits === 1 ? 'circuit' : 'circuits'} • {activeCircuits} active • {spareCircuits} spare • {poweredOnCircuits} on • {poweredOffCircuits} off
        </div>
        {/* Capacity bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              usagePercent > 80
                ? 'bg-destructive'
                : usagePercent > 60
                ? 'bg-yellow-500'
                : 'bg-primary'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
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
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Powered OFF</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span>Spare</span>
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
