import { useState } from 'react'
import type { Panel } from '@shared/types'
import type { OnboardingData } from './OnboardingWizard'

interface Step4ReadyToMapProps {
  data: OnboardingData
  onComplete: (panel: Panel) => void
  onBack: () => void
}

export function Step4ReadyToMap({ data, onComplete, onBack }: Step4ReadyToMapProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = async () => {
    setIsCreating(true)
    setError(null)

    try {
      // Create the panel
      const panel = await window.electronAPI.panels.create({
        name: data.panelName,
        total_positions: data.totalPositions,
        main_breaker_amperage: data.mainBreakerAmperage
      })

      // Create breakers for all positions
      const breakerInputs = Array.from({ length: data.totalPositions }, (_, i) => ({
        panel_id: panel.id,
        position: i + 1,
        breaker_type: 'single-pole' as const,
        amperage: 15,
        status: 'spare' as const
      }))

      await window.electronAPI.breakers.createBatch(breakerInputs)

      // Create entities (if any)
      if (data.entities.length > 0) {
        const entityInputs = data.entities.map(entity => ({
          panel_id: panel.id,
          breaker_id: null, // Start as unmapped
          entity_type: entity.entity_type,
          name: entity.name,
          room: entity.room,
          location: entity.location
        }))

        await window.electronAPI.entities.createBatch(entityInputs)
      }

      onComplete(panel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create panel')
      setIsCreating(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 4: Ready to Map!</h2>
      <p className="text-muted-foreground mb-6">
        Review your setup and create your panel. You'll be able to map entities to breakers next.
      </p>

      {/* Summary */}
      <div className="space-y-4 mb-8">
        <div className="p-4 border border-border rounded-md bg-muted/30">
          <h3 className="font-semibold mb-2">Panel Configuration</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="font-medium text-foreground">Name:</span> {data.panelName}
            </div>
            <div>
              <span className="font-medium text-foreground">Positions:</span> {data.totalPositions}
            </div>
            <div>
              <span className="font-medium text-foreground">Main Breaker:</span> {data.mainBreakerAmperage}A
            </div>
          </div>
        </div>

        {data.rooms.length > 0 && (
          <div className="p-4 border border-border rounded-md bg-muted/30">
            <h3 className="font-semibold mb-2">Rooms</h3>
            <div className="text-sm text-muted-foreground">
              {data.rooms.join(', ') || 'None'}
            </div>
          </div>
        )}

        <div className="p-4 border border-border rounded-md bg-muted/30">
          <h3 className="font-semibold mb-2">Entities</h3>
          <div className="text-sm text-muted-foreground">
            {data.entities.length > 0 ? (
              <>
                {data.entities.length} entity(ies) added
                <div className="mt-2 text-xs">
                  {data.entities.length} unmapped entity(ies) ready to assign
                </div>
              </>
            ) : (
              'None added yet'
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2">
        <button
          onClick={onBack}
          disabled={isCreating}
          className="px-6 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={isCreating}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Panel...' : 'Create Panel'}
        </button>
      </div>
    </div>
  )
}
