import { useState, useEffect } from 'react'
import type { Panel } from '@shared/types'

interface AddPanelModalProps {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingPanels?: Panel[]
}

export function AddPanelModal({ propertyId, isOpen, onClose, onSuccess, existingPanels }: AddPanelModalProps) {
  const [panelName, setPanelName] = useState('')
  const [totalPositions, setTotalPositions] = useState(24)
  const [mainBreakerAmperage, setMainBreakerAmperage] = useState(200)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templatePanelId, setTemplatePanelId] = useState<string>('')
  const [copyEntities, setCopyEntities] = useState(false)

  if (!isOpen) return null

  const addRow = () => {
    if (totalPositions < 100) {
      setTotalPositions(totalPositions + 2)
    }
  }

  const removeRow = () => {
    if (totalPositions > 2) {
      setTotalPositions(totalPositions - 2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!panelName.trim()) {
      setError('Panel name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Create the panel
      const panel = await window.electronAPI.panels.create({
        property_id: propertyId,
        name: panelName.trim(),
        total_positions: totalPositions,
        main_breaker_amperage: mainBreakerAmperage
      })

      // Create breakers for all positions
      const breakerInputs = Array.from({ length: totalPositions }, (_, i) => ({
        panel_id: panel.id,
        position: i + 1,
        breaker_type: 'single-pole' as const,
        amperage: 15,
        status: 'spare' as const
      }))

      await window.electronAPI.breakers.createBatch(breakerInputs)

      // Copy entities from template if selected
      if (copyEntities && templatePanelId) {
        const templateEntities = await window.electronAPI.entities.listByPanel(templatePanelId)

        // Create entity copies with new IDs but same properties
        const entityCopyInputs = templateEntities.map(entity => ({
          panel_id: panel.id,
          breaker_ids: [], // Unmapped by default - user will map them
          name: entity.name,
          entity_type: entity.entity_type,
          room: entity.room,
          location: entity.location
        }))

        // Create all entities in batch
        await Promise.all(
          entityCopyInputs.map(input => window.electronAPI.entities.create(input))
        )
      }

      setPanelName('')
      setTotalPositions(24)
      setMainBreakerAmperage(200)
      setTemplatePanelId('')
      setCopyEntities(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create panel')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setPanelName('')
      setTotalPositions(24)
      setMainBreakerAmperage(200)
      setError(null)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-[600px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold">Add New Panel</h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
            {/* Panel name */}
            <div>
              <label className="block text-sm font-medium mb-2">Panel Name</label>
              <input
                type="text"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="e.g., Main Panel, Garage Panel, Sub Panel"
                autoFocus
                disabled={isCreating}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {/* Main breaker amperage */}
            <div>
              <label className="block text-sm font-medium mb-2">Main Breaker Amperage</label>
              <select
                value={mainBreakerAmperage}
                onChange={(e) => setMainBreakerAmperage(Number(e.target.value))}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:opacity-50"
              >
                <option value={100}>100A</option>
                <option value={125}>125A</option>
                <option value={150}>150A</option>
                <option value={200}>200A</option>
                <option value={225}>225A</option>
                <option value={400}>400A</option>
              </select>
            </div>

            {/* Template selection - only show if existing panels */}
            {existingPanels && existingPanels.length > 0 && (
              <div className="border border-border rounded-md p-4 bg-muted/30">
                <h4 className="text-sm font-semibold mb-2">Copy from Template (Optional)</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Use an existing panel as a template to copy rooms and entities
                </p>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Template Panel</label>
                  <select
                    value={templatePanelId}
                    onChange={(e) => setTemplatePanelId(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:opacity-50"
                  >
                    <option value="">No template - start from scratch</option>
                    {existingPanels.map(panel => (
                      <option key={panel.id} value={panel.id}>
                        {panel.name}
                      </option>
                    ))}
                  </select>
                </div>

                {templatePanelId && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="copyEntities"
                      checked={copyEntities}
                      onChange={(e) => setCopyEntities(e.target.checked)}
                      disabled={isCreating}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label htmlFor="copyEntities" className="text-sm cursor-pointer">
                      Copy entities as templates (rooms and entity types will be copied)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Panel visualization */}
            <div>
              <label className="block text-sm font-medium mb-2">Panel Layout</label>
              <div className="border border-border rounded-md p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {Array.from({ length: totalPositions }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center h-10 border border-border rounded bg-background text-xs text-muted-foreground"
                    >
                      Position {i + 1}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    {totalPositions} positions ({totalPositions / 2} rows)
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={removeRow}
                      disabled={totalPositions <= 2 || isCreating}
                      className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove Row
                    </button>
                    <button
                      type="button"
                      onClick={addRow}
                      disabled={totalPositions >= 100 || isCreating}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Row
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="border-t border-border p-6 bg-background">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !panelName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? 'Creating Panel...' : 'Create Panel'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
