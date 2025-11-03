import { useState } from 'react'
import type { Panel } from '@shared/types'

interface PanelSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentPanel: Panel
  propertyPanels: Panel[]
  propertyName: string
  onPanelSelect: (panelId: string) => void
  onAddPanel: () => void
}

export function PanelSelectorModal({
  isOpen,
  onClose,
  currentPanel,
  propertyPanels,
  propertyName,
  onPanelSelect,
  onAddPanel
}: PanelSelectorModalProps) {
  const [selectedPanelId, setSelectedPanelId] = useState(currentPanel.id)

  if (!isOpen) return null

  const handlePanelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === '__add_new__') {
      onClose()
      onAddPanel()
    } else {
      setSelectedPanelId(value)
    }
  }

  const handleSwitch = () => {
    if (selectedPanelId !== currentPanel.id) {
      onPanelSelect(selectedPanelId)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-[450px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">Switch Panel</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Panel in "{propertyName}"</label>
          <select
            value={selectedPanelId}
            onChange={handlePanelChange}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            autoFocus
          >
            {propertyPanels.map(panel => (
              <option key={panel.id} value={panel.id}>
                {panel.name} ({panel.total_positions} positions)
              </option>
            ))}
            <option disabled>──────────</option>
            <option value="__add_new__">+ Add New Panel</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSwitch}
            disabled={selectedPanelId === currentPanel.id}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  )
}
