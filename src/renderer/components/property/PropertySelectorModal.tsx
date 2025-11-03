import { useState } from 'react'
import type { Property } from '@shared/types'

interface PropertySelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentProperty: Property
  allProperties: Property[]
  onPropertySelect: (propertyId: string) => void
}

export function PropertySelectorModal({
  isOpen,
  onClose,
  currentProperty,
  allProperties,
  onPropertySelect
}: PropertySelectorModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(currentProperty.id)

  if (!isOpen) return null

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPropertyId(e.target.value)
  }

  const handleSwitch = () => {
    if (selectedPropertyId !== currentProperty.id) {
      onPropertySelect(selectedPropertyId)
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
        <h3 className="text-lg font-bold mb-4">Switch Property</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Property</label>
          <select
            value={selectedPropertyId}
            onChange={handlePropertyChange}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            autoFocus
          >
            {allProperties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            To add a new property, go to Settings
          </p>
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
            disabled={selectedPropertyId === currentProperty.id}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  )
}
