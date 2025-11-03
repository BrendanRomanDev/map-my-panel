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
      await window.electronAPI.breakers.update(breakerId, {
        is_powered: isPowered
      })

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

  // Calculate sum of ALL breakers (to compare with main breaker rating)
  const sumOfAllBreakers = breakers.reduce((sum, b) => sum + b.amperage, 0)

  // Check if there's a mismatch between sum and main breaker
  const hasMismatch = sumOfAllBreakers !== panel.main_breaker_amperage

  const usagePercent = Math.round((totalAmperage / panel.main_breaker_amperage) * 100)

  return (
    <div className="space-y-6">
      {/* Panel header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{panel.name}</h2>
          <p className="text-sm text-muted-foreground">
            {panel.total_positions} positions • {panel.main_breaker_amperage}A main breaker
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {totalAmperage}A used
          </div>
          <div className="text-sm text-muted-foreground flex items-center justify-end gap-1">
            <span>
              {totalAmperage}A / {sumOfAllBreakers}A of {panel.main_breaker_amperage}A capacity
            </span>
            {hasMismatch && (
              <span
                className="inline-flex items-center text-yellow-600 dark:text-yellow-500 cursor-help"
                title={`Your breakers add up to ${sumOfAllBreakers}A but your main breaker is rated ${panel.main_breaker_amperage}A. ${
                  sumOfAllBreakers > panel.main_breaker_amperage
                    ? 'This exceeds your panel capacity! Update individual breakers or adjust your main breaker rating.'
                    : 'Update individual breakers or adjust your main breaker rating in settings.'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
            )}
          </div>
          {/* Capacity bar */}
          <div className="mt-2 w-48 h-2 bg-muted rounded-full overflow-hidden">
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
