import { useState } from 'react'
import type { Property, Panel } from '@shared/types'

interface PropertyPanelSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentProperty: Property
  currentPanel: Panel
  allProperties: Property[]
  propertyPanels: Panel[]
  onPropertySelect: (propertyId: string) => void
  onPanelSelect: (panelId: string) => void
  onAddProperty: () => void
  onAddPanel: () => void
}

export function PropertyPanelSelectorModal({
  isOpen,
  onClose,
  currentProperty,
  currentPanel,
  allProperties,
  propertyPanels,
  onPropertySelect,
  onPanelSelect,
  onAddProperty,
  onAddPanel
}: PropertyPanelSelectorModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(currentProperty.id)
  const [selectedPanelId, setSelectedPanelId] = useState(currentPanel.id)

  if (!isOpen) return null

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === '__add_new__') {
      onClose()
      onAddProperty()
    } else {
      setSelectedPropertyId(value)
    }
  }

  const handlePanelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === '__add_new__') {
      onClose()
      onAddPanel()
    } else {
      setSelectedPanelId(value)
    }
  }

  const handleApply = () => {
    if (selectedPropertyId !== currentProperty.id) {
      onPropertySelect(selectedPropertyId)
    } else if (selectedPanelId !== currentPanel.id) {
      onPanelSelect(selectedPanelId)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
        <h3 className="text-lg font-bold mb-4">Switch Property or Panel</h3>

        <div className="space-y-4">
          {/* Property selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Property</label>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              {allProperties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__add_new__">+ Add New Property</option>
            </select>
          </div>

          {/* Panel selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Panel</label>
            <select
              value={selectedPanelId}
              onChange={handlePanelChange}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              {propertyPanels.map(panel => (
                <option key={panel.id} value={panel.id}>
                  {panel.name} ({panel.total_positions} positions)
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__add_new__">+ Add New Panel</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Panels in "{allProperties.find(p => p.id === selectedPropertyId)?.name}"
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  )
}
