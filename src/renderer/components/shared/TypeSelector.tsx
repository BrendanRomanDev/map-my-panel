import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'

// Default entity types (includes "other" as fallback for deleted types)
const DEFAULT_TYPES = ['outlet', 'switch', 'light', 'appliance', 'hvac', 'other'] as const

interface TypeSelectorProps {
  panelId: string
  value: string
  onChange: (type: string) => void
  placeholder?: string
}

export function TypeSelector({ panelId, value, onChange, placeholder = 'Select or add type' }: TypeSelectorProps) {
  const queryClient = useQueryClient()
  const { data: panel } = useQuery({
    queryKey: queryKeys.panels.detail(panelId),
    queryFn: () => window.electronAPI.panels.findById(panelId)
  })

  const { data: property } = useQuery({
    queryKey: ['property', panel?.property_id],
    queryFn: () => window.electronAPI.properties.findById(panel!.property_id),
    enabled: !!panel
  })

  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Combine default types with custom types from the property
  const customTypes = property?.custom_entity_types || []
  const allTypes = [...DEFAULT_TYPES, ...customTypes].sort()

  // Check if current value is a custom type (not in existing list)
  useEffect(() => {
    if (value && !allTypes.includes(value)) {
      setIsAddingNew(true)
      setNewTypeName(value)
    }
  }, [value, allTypes.join(',')])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value

    if (selectedValue === '__add_new__') {
      setIsAddingNew(true)
      setNewTypeName('')
      onChange('')
    } else {
      setIsAddingNew(false)
      onChange(selectedValue)
    }
  }

  const handleNewTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase()
    setNewTypeName(newValue)
    onChange(newValue)
  }

  const handleSaveNewType = async () => {
    if (!newTypeName.trim() || !property) return

    const finalTypeName = newTypeName.trim().toLowerCase()

    // Only save if it's not already in the list
    if (!customTypes.includes(finalTypeName) && !DEFAULT_TYPES.includes(finalTypeName as any)) {
      setIsCreating(true)
      try {
        await window.electronAPI.properties.addCustomEntityType(property.id, finalTypeName)
        // Invalidate property query to refresh custom types
        await queryClient.invalidateQueries({ queryKey: ['property', property.id] })
      } catch (error) {
        console.error('Failed to add custom entity type:', error)
      } finally {
        setIsCreating(false)
      }
    }

    setIsAddingNew(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveNewType()
    } else if (e.key === 'Escape') {
      handleCancelNew()
    }
  }

  const handleCancelNew = () => {
    setIsAddingNew(false)
    setNewTypeName('')
    onChange('')
  }

  if (isAddingNew) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTypeName}
            onChange={handleNewTypeChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter entity type"
            autoFocus
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleSaveNewType}
            disabled={!newTypeName.trim() || isCreating}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            {isCreating ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleCancelNew}
            disabled={isCreating}
            className="px-3 py-2 border border-border rounded-md hover:bg-muted text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isCreating ? (
            <span>Saving custom type...</span>
          ) : (
            <>Type: <strong>{newTypeName || '(enter type name)'}</strong> • Press Enter or click Save</>
          )}
        </p>
      </div>
    )
  }

  return (
    <select
      value={value || ''}
      onChange={handleSelectChange}
      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
    >
      <option value="">{placeholder}</option>
      {DEFAULT_TYPES.map(type => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
      {customTypes.length > 0 && <option disabled>──────────</option>}
      {customTypes.map(type => (
        <option key={type} value={type}>
          {type} (custom)
        </option>
      ))}
      <option value="__add_new__">+ Add New Type</option>
    </select>
  )
}
