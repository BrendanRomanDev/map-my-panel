import { useState, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { generatePanelPDF } from '../../utils/pdfExport'
import { useTheme } from '../../contexts/ThemeContext'
import type { Panel, Property } from '@shared/types'

interface SettingsViewProps {
  propertyId: string
  panelId: string
  onReset: () => void
  onPropertyChange?: (propertyId: string, panelId: string) => void
}

export function SettingsView({ propertyId, panelId, onReset, onPropertyChange }: SettingsViewProps) {
  const queryClient = useQueryClient()
  const { theme, setTheme, availableThemes } = useTheme()

  // All useState hooks MUST be called before any conditional returns
  const [showConfirmStep1, setShowConfirmStep1] = useState(false)
  const [showConfirmStep2, setShowConfirmStep2] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Rooms management state
  const [rooms, setRooms] = useState<Array<{ room: string; count: number }>>([])
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')

  // Types management state
  const [entityTypes, setEntityTypes] = useState<Array<{ entity_type: string; count: number }>>([])
  const [deletingType, setDeletingType] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [newTypeNameEdit, setNewTypeNameEdit] = useState('')
  const [isAddingNewType, setIsAddingNewType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [isCreatingType, setIsCreatingType] = useState(false)

  // Confirmation modals state
  const [roomToDelete, setRoomToDelete] = useState<{ name: string; entities: Array<{ id: string; name: string }> } | null>(null)
  const [typeToDelete, setTypeToDelete] = useState<{ name: string; entities: Array<{ id: string; name: string }> } | null>(null)

  // Backup/restore state
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // PDF export state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Property management state
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [newPropertyName, setNewPropertyName] = useState('')
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null)
  const [isAddingProperty, setIsAddingProperty] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [editingPropertyName, setEditingPropertyName] = useState('')

  // Panel management state
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
  const [editingPanelName, setEditingPanelName] = useState('')
  const [showEditPanelLayoutModal, setShowEditPanelLayoutModal] = useState(false)
  const [editLayoutPositions, setEditLayoutPositions] = useState(0)
  const [isUpdatingLayout, setIsUpdatingLayout] = useState(false)

  // Delete panel state
  const [showDeletePanelConfirm, setShowDeletePanelConfirm] = useState(false)
  const [deletePanelConfirmText, setDeletePanelConfirmText] = useState('')
  const [isDeletingPanel, setIsDeletingPanel] = useState(false)

  // Main breaker amperage edit state
  const [editingMainBreakerAmperage, setEditingMainBreakerAmperage] = useState(false)
  const [mainBreakerAmperageValue, setMainBreakerAmperageValue] = useState(0)

  // Tab state
  const [activeTab, setActiveTab] = useState<'properties' | 'panel'>('properties')

  // Display settings
  const [showRoomsOnBreakers, setShowRoomsOnBreakers] = useState(() => {
    const saved = localStorage.getItem('showRoomsOnBreakers')
    return saved === 'true'
  })

  const [highlightBreakerOnHover, setHighlightBreakerOnHover] = useState(() => {
    const saved = localStorage.getItem('highlightBreakerOnHover')
    return saved !== 'false' // Default to true
  })

  // Query for property and panel data using IDs - React Query handles caching
  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => window.electronAPI.properties.findById(propertyId),
    enabled: !!propertyId
  })

  const { data: panel } = useQuery({
    queryKey: ['panel', panelId],
    queryFn: () => window.electronAPI.panels.findById(panelId),
    enabled: !!panelId
  })

  // Fetch all properties
  const { data: allProperties, refetch: refetchProperties } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => window.electronAPI.properties.findAll()
  })

  // Fetch all panels for current property
  const { data: propertyPanels } = useQuery({
    queryKey: ['panels', 'byProperty', propertyId],
    queryFn: () => window.electronAPI.panels.findByProperty(propertyId),
    enabled: !!propertyId
  })

  // Fetch panels for all properties to show counts
  const { data: allPanelsForAllProperties } = useQuery({
    queryKey: ['panels', 'allPropertiesPanels'],
    queryFn: async () => {
      if (!allProperties) return {}

      const panelsByProperty: Record<string, number> = {}

      await Promise.all(
        allProperties.map(async (prop) => {
          const panels = await window.electronAPI.panels.findByProperty(prop.id)
          panelsByProperty[prop.id] = panels?.length || 0
        })
      )

      return panelsByProperty
    },
    enabled: !!allProperties
  })

  // Early return if data is loading
  if (!property || !panel) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  // Load rooms and types
  useEffect(() => {
    loadRoomsAndTypes()
  }, [panel.id])

  // Sync editLayoutPositions when panel changes
  useEffect(() => {
    setEditLayoutPositions(panel.total_positions)
  }, [panel.total_positions])

  // Sync mainBreakerAmperageValue when panel changes
  useEffect(() => {
    setMainBreakerAmperageValue(panel.main_breaker_amperage)
  }, [panel.main_breaker_amperage])

  const loadRoomsAndTypes = async () => {
    try {
      const [roomsData, typesData] = await Promise.all([
        window.electronAPI.entities.getAllRooms(panel.id),
        window.electronAPI.entities.getAllEntityTypes(panel.id)
      ])
      setRooms(roomsData)
      setEntityTypes(typesData)
    } catch (error) {
      console.error('Failed to load rooms and types:', error)
    }
  }

  const handleResetClick = () => {
    setShowConfirmStep1(true)
  }

  const handleConfirmStep1 = () => {
    setShowConfirmStep1(false)
    setShowConfirmStep2(true)
  }

  const handleCancelStep1 = () => {
    setShowConfirmStep1(false)
  }

  const handleCancelStep2 = () => {
    setShowConfirmStep2(false)
    setConfirmText('')
  }

  const handleConfirmStep2 = async () => {
    if (confirmText !== panel.name) return

    setIsResetting(true)
    try {
      // Reset the panel (delete all breakers and entities, but keep the panel)
      const result = await window.electronAPI.panels.reset(panel.id)
      console.log(`Reset complete: ${result.entitiesDeleted} entities and ${result.breakersDeleted} breakers deleted`)

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['breakers'] })
      queryClient.invalidateQueries({ queryKey: ['entities'] })

      // Close modals and reset state
      setShowConfirmStep2(false)
      setConfirmText('')
      setIsResetting(false)

      alert('Panel reset successfully. All breakers and entities have been deleted.')
    } catch (error) {
      console.error('Failed to reset panel:', error)
      alert('Failed to reset panel. Please try again.')
      setIsResetting(false)
      setShowConfirmStep2(false)
      setConfirmText('')
    }
  }

  const handleDeletePanel = async () => {
    if (deletePanelConfirmText !== panel.name) return

    setIsDeletingPanel(true)
    try {
      // Delete the panel (cascade will delete all breakers and entities)
      await window.electronAPI.panels.delete(panel.id)

      // Check if there are other panels in this property
      const remainingPanels = await window.electronAPI.panels.findByProperty(property.id)

      if (remainingPanels && remainingPanels.length > 0) {
        // Switch to the first available panel
        const firstPanel = remainingPanels[0]
        if (onPropertyChange) {
          onPropertyChange(property, firstPanel)
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['panels'] })
        queryClient.invalidateQueries({ queryKey: ['breakers'] })
        queryClient.invalidateQueries({ queryKey: ['entities'] })
      } else {
        // No panels left, trigger the "no panels" state
        onReset()
      }

      // Close modal and reset state
      setShowDeletePanelConfirm(false)
      setDeletePanelConfirmText('')
      setIsDeletingPanel(false)
    } catch (error) {
      console.error('Failed to delete panel:', error)
      alert('Failed to delete panel. Please try again.')
      setIsDeletingPanel(false)
      setShowDeletePanelConfirm(false)
      setDeletePanelConfirmText('')
    }
  }

  // Room management handlers
  const handleDeleteRoomClick = async (roomName: string) => {
    try {
      // Fetch all entities in this room
      const allEntities = await window.electronAPI.entities.listByPanel(panel.id)
      const entitiesInRoom = allEntities.filter(e => e.room === roomName)

      if (entitiesInRoom.length === 0) {
        // No entities, just delete without confirmation
        await window.electronAPI.entities.deleteRoom(panel.id, roomName)
        await loadRoomsAndTypes()
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panel.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.byRoom(panel.id) })
        return
      }

      // Show confirmation with list of entities
      setRoomToDelete({
        name: roomName,
        entities: entitiesInRoom.map(e => ({ id: e.id, name: e.name }))
      })
    } catch (error) {
      console.error('Failed to prepare room deletion:', error)
      alert('Failed to prepare room deletion')
    }
  }

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return

    try {
      await window.electronAPI.entities.deleteRoom(panel.id, roomToDelete.name)
      await loadRoomsAndTypes()
      setRoomToDelete(null)
      // Invalidate entity queries
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panel.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byRoom(panel.id) })
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Failed to delete room')
    }
  }

  const handleRenameRoom = async (oldName: string) => {
    if (!newRoomName.trim() || newRoomName === oldName) {
      setEditingRoom(null)
      setNewRoomName('')
      return
    }

    try {
      await window.electronAPI.entities.renameRoom(panel.id, oldName, newRoomName.trim())
      await loadRoomsAndTypes()
      setEditingRoom(null)
      setNewRoomName('')
      // Invalidate entity queries
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panel.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byRoom(panel.id) })
    } catch (error) {
      console.error('Failed to rename room:', error)
      alert('Failed to rename room')
    }
  }

  // Type management handlers
  const handleDeleteTypeClick = async (typeName: string) => {
    console.log('Attempting to delete type:', typeName)

    try {
      // Fetch all entities with this type
      const allEntities = await window.electronAPI.entities.listByPanel(panel.id)
      const entitiesWithType = allEntities.filter(e => e.entity_type === typeName)

      console.log(`Type "${typeName}" has ${entitiesWithType.length} entities`)

      if (entitiesWithType.length === 0) {
        // No entities, just delete without confirmation
        console.log('Removing custom entity type...')
        const result = await window.electronAPI.properties.removeCustomEntityType(property.id, typeName)
        console.log('Remove result:', result)

        // Invalidate and refetch property data immediately
        console.log('Invalidating queries...')
        await queryClient.invalidateQueries({
          queryKey: ['property', property.id],
          refetchType: 'active'
        })
        await queryClient.invalidateQueries({
          queryKey: ['properties', 'all'],
          refetchType: 'active'
        })

        // Force refetch of property data
        await refetchProperties()

        // Reload rooms and types
        console.log('Reloading rooms and types...')
        await loadRoomsAndTypes()

        console.log('Type deleted successfully')
        return
      }

      // Show confirmation with list of entities
      setTypeToDelete({
        name: typeName,
        entities: entitiesWithType.map(e => ({ id: e.id, name: e.name }))
      })
    } catch (error) {
      console.error('Failed to delete type:', error)
      alert(`Failed to delete type: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const confirmDeleteType = async () => {
    if (!typeToDelete) return

    try {
      // Change all entities with this type to "other"
      await window.electronAPI.entities.changeEntityType(panel.id, typeToDelete.name, 'other')

      // Remove from property's custom types
      await window.electronAPI.properties.removeCustomEntityType(property.id, typeToDelete.name)

      // Reload data
      await loadRoomsAndTypes()
      setTypeToDelete(null)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['property', property.id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panel.id) })
    } catch (error) {
      console.error('Failed to delete type:', error)
      alert('Failed to delete type')
    }
  }

  const handleRenameType = async (oldTypeName: string) => {
    if (!newTypeNameEdit.trim() || newTypeNameEdit.trim() === oldTypeName) {
      setEditingType(null)
      setNewTypeNameEdit('')
      return
    }

    const newName = newTypeNameEdit.trim().toLowerCase()

    // Check if new name already exists
    if (property.custom_entity_types.includes(newName)) {
      alert('A custom type with this name already exists')
      return
    }

    try {
      // Change all entities with the old type to the new type name
      await window.electronAPI.entities.changeEntityType(panel.id, oldTypeName, newName)

      // Remove old type from property's custom types
      await window.electronAPI.properties.removeCustomEntityType(property.id, oldTypeName)

      // Add new type to property's custom types
      await window.electronAPI.properties.addCustomEntityType(property.id, newName)

      // Reload data
      await loadRoomsAndTypes()
      setEditingType(null)
      setNewTypeNameEdit('')

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['property', property.id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panel.id) })
    } catch (error) {
      console.error('Failed to rename type:', error)
      alert('Failed to rename type')
    }
  }

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      alert('Type name cannot be empty')
      return
    }

    const typeName = newTypeName.trim().toLowerCase()
    const defaultTypes = ['outlet', 'switch', 'light', 'appliance', 'hvac', 'other']

    // Check if it's a default type
    if (defaultTypes.includes(typeName)) {
      alert('This is a default type and already exists')
      return
    }

    // Check if it already exists
    if (property.custom_entity_types.includes(typeName)) {
      alert('A custom type with this name already exists')
      return
    }

    setIsCreatingType(true)
    try {
      // Add new type to property's custom types
      await window.electronAPI.properties.addCustomEntityType(property.id, typeName)

      // Invalidate and refetch property data immediately
      await queryClient.invalidateQueries({
        queryKey: ['property', property.id],
        refetchType: 'active'
      })
      await queryClient.invalidateQueries({
        queryKey: ['properties', 'all'],
        refetchType: 'active'
      })

      // Force refetch of property data
      await refetchProperties()

      // Reload rooms and types
      await loadRoomsAndTypes()

      // Reset form
      setIsAddingNewType(false)
      setNewTypeName('')
    } catch (error) {
      console.error('Failed to add custom type:', error)
      alert('Failed to add custom type')
    } finally {
      setIsCreatingType(false)
    }
  }

  // Backup/restore handlers
  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const result = await window.electronAPI.backup.export()
      alert(result.message)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBackup = async () => {
    if (!confirm('WARNING: Importing a backup will DELETE all current data and replace it with the backup. This cannot be undone.\n\nAre you sure you want to continue?')) {
      return
    }

    setIsImporting(true)
    try {
      const result = await window.electronAPI.backup.import()
      alert(result.message)

      if (result.success) {
        // Reload all data
        await loadRoomsAndTypes()
        queryClient.invalidateQueries()
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // PDF export handler
  const handleExportPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Fetch all data needed for PDF
      const [breakers, entities] = await Promise.all([
        window.electronAPI.breakers.listByPanel(panel.id),
        window.electronAPI.entities.listByPanel(panel.id)
      ])

      await generatePanelPDF(panel, breakers, entities)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Property management handlers
  const handleAddProperty = async () => {
    if (!newPropertyName.trim()) {
      alert('Please enter a property name')
      return
    }

    setIsAddingProperty(true)
    try {
      await window.electronAPI.properties.create({
        name: newPropertyName.trim()
      })

      // Refetch properties to show the new one in the list
      await refetchProperties()

      // Close modal
      setShowAddPropertyModal(false)
      setNewPropertyName('')

      // Stay on current property - don't switch
    } catch (error) {
      console.error('Failed to add property:', error)
      alert('Failed to add property')
    } finally {
      setIsAddingProperty(false)
    }
  }

  const handleDeleteProperty = async (propertyToDelete: Property) => {
    if (allProperties && allProperties.length <= 1) {
      alert('Cannot delete the last property')
      return
    }

    if (propertyToDelete.id === property.id) {
      // Deleting current property, need to switch to another one first
      const otherProperty = allProperties?.find(p => p.id !== propertyToDelete.id)
      if (!otherProperty) {
        alert('Cannot delete the last property')
        return
      }

      // Switch to the other property first
      await window.electronAPI.properties.setAsCurrent(otherProperty.id)
      const firstPanel = await window.electronAPI.panels.getCurrentOrNull()

      if (firstPanel && onPropertyChange) {
        onPropertyChange(otherProperty.id, firstPanel.id)
      }
    }

    // Now delete the property (cascade will delete panels and their data)
    try {
      await window.electronAPI.properties.delete(propertyToDelete.id)
      await refetchProperties()
      setPropertyToDelete(null)
    } catch (error) {
      console.error('Failed to delete property:', error)
      alert('Failed to delete property')
    }
  }

  const handleRenameProperty = async (propertyId: string) => {
    if (!editingPropertyName.trim() || editingPropertyName === allProperties?.find(p => p.id === propertyId)?.name) {
      setEditingPropertyId(null)
      setEditingPropertyName('')
      return
    }

    try {
      await window.electronAPI.properties.update(propertyId, {
        name: editingPropertyName.trim()
      })
      await refetchProperties()
      setEditingPropertyId(null)
      setEditingPropertyName('')
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    } catch (error) {
      console.error('Failed to rename property:', error)
      alert('Failed to rename property')
    }
  }

  const handleRenamePanel = async () => {
    if (!editingPanelName.trim() || editingPanelName === panel.name) {
      setEditingPanelId(null)
      setEditingPanelName('')
      return
    }

    try {
      await window.electronAPI.panels.update(panel.id, {
        name: editingPanelName.trim()
      })
      setEditingPanelId(null)
      setEditingPanelName('')
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['panels'] })
    } catch (error) {
      console.error('Failed to rename panel:', error)
      alert('Failed to rename panel')
    }
  }

  const handleUpdateMainBreakerAmperage = async () => {
    if (mainBreakerAmperageValue === panel.main_breaker_amperage) {
      setEditingMainBreakerAmperage(false)
      return
    }

    try {
      await window.electronAPI.panels.update(panel.id, {
        main_breaker_amperage: mainBreakerAmperageValue
      })
      setEditingMainBreakerAmperage(false)
      // Invalidate queries to refresh UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['panels'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['panels', property.id], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['panel', panel.id], refetchType: 'active' })
      ])
    } catch (error) {
      console.error('Failed to update main breaker amperage:', error)
      alert('Failed to update main breaker amperage')
    }
  }

  const handleOpenEditLayout = () => {
    setEditLayoutPositions(panel.total_positions)
    setShowEditPanelLayoutModal(true)
  }

  const handleAddLayoutRow = () => {
    if (editLayoutPositions < 100) {
      setEditLayoutPositions(editLayoutPositions + 2)
    }
  }

  const handleRemoveLayoutRow = () => {
    if (editLayoutPositions > 2) {
      setEditLayoutPositions(editLayoutPositions - 2)
    }
  }

  const handleSaveLayout = async () => {
    if (editLayoutPositions === panel.total_positions) {
      setShowEditPanelLayoutModal(false)
      return
    }

    setIsUpdatingLayout(true)

    try {
      if (editLayoutPositions < panel.total_positions) {
        // Removing rows - check if any entities are mapped to those positions
        const allBreakers = await window.electronAPI.breakers.listByPanel(panel.id)
        const allEntities = await window.electronAPI.entities.listByPanel(panel.id)

        // Find breakers that will be deleted
        const breakersToDelete = allBreakers.filter(b => b.position > editLayoutPositions)
        const breakerIdsToDelete = new Set(breakersToDelete.map(b => b.id))

        // Find entities mapped to those breakers
        const affectedEntities = allEntities.filter(e =>
          e.breaker_ids.some(breakerId => breakerIdsToDelete.has(breakerId))
        )

        if (affectedEntities.length > 0) {
          const entityNames = affectedEntities.map(e => e.name).join(', ')
          const confirmed = confirm(
            `Warning: ${affectedEntities.length} ${affectedEntities.length === 1 ? 'entity is' : 'entities are'} mapped to breaker positions ${editLayoutPositions + 1}-${panel.total_positions}.\n\n` +
            `Entities: ${entityNames}\n\n` +
            `These entities will be unmapped (not deleted) and you'll need to remap them to other breakers.\n\n` +
            `Continue?`
          )

          if (!confirmed) {
            setIsUpdatingLayout(false)
            return
          }
        }

        // Collect all breaker IDs to remove from entities (deleted breakers + their linked partners)
        const breakerIdsToRemove = new Set(breakerIdsToDelete)
        for (const breaker of breakersToDelete) {
          // If a deleted breaker has a linked partner that's not being deleted,
          // we should also remove that partner from entities (240V circuit is broken)
          if (breaker.linked_breaker_id && !breakerIdsToDelete.has(breaker.linked_breaker_id)) {
            breakerIdsToRemove.add(breaker.linked_breaker_id)
          }
        }

        // Unmap affected entities - remove all relevant breaker IDs from their breaker_ids arrays
        for (const entity of affectedEntities) {
          const newBreakerIds = entity.breaker_ids.filter(id => !breakerIdsToRemove.has(id))
          await window.electronAPI.entities.update(entity.id, {
            breaker_ids: newBreakerIds
          })
        }

        // Delete the breakers
        for (const breaker of breakersToDelete) {
          await window.electronAPI.breakers.delete(breaker.id)
        }
      } else {
        // Adding rows - create new breakers
        const breakerInputs = Array.from(
          { length: editLayoutPositions - panel.total_positions },
          (_, i) => ({
            panel_id: panel.id,
            position: panel.total_positions + i + 1,
            breaker_type: 'single-pole' as const,
            amperage: 15,
            status: 'spare' as const
          })
        )

        await window.electronAPI.breakers.createBatch(breakerInputs)
      }

      // Update panel total_positions
      await window.electronAPI.panels.update(panel.id, {
        total_positions: editLayoutPositions
      })

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['breakers'] })
      queryClient.invalidateQueries({ queryKey: ['entities'] })

      setShowEditPanelLayoutModal(false)
    } catch (error) {
      console.error('Failed to update panel layout:', error)
      alert('Failed to update panel layout')
    } finally {
      setIsUpdatingLayout(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'properties'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('panel')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'panel'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Current Panel
          </button>
        </div>
      </div>

      {/* Properties Tab Content */}
      {activeTab === 'properties' && (
        <div className="space-y-6">
          {/* Theme Selection Section */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Appearance</h2>
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.values(availableThemes).map((themeOption) => (
                      <option key={themeOption.id} value={themeOption.id}>
                        {themeOption.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    {availableThemes[theme]?.description || 'Theme description'}
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRoomsOnBreakers}
                      onChange={(e) => {
                        const newValue = e.target.checked
                        setShowRoomsOnBreakers(newValue)
                        localStorage.setItem('showRoomsOnBreakers', String(newValue))
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <div>
                      <div className="text-sm font-medium">Show rooms on breaker cards</div>
                      <div className="text-xs text-muted-foreground">
                        Display which rooms are affected by each breaker on the panel grid
                      </div>
                    </div>
                  </label>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={highlightBreakerOnHover}
                      onChange={(e) => {
                        const newValue = e.target.checked
                        setHighlightBreakerOnHover(newValue)
                        localStorage.setItem('highlightBreakerOnHover', String(newValue))
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <div>
                      <div className="text-sm font-medium">Highlight breaker on entity hover</div>
                      <div className="text-xs text-muted-foreground">
                        When hovering over an entity card, highlight its associated breaker(s) on the panel grid
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Manage Properties Section */}
          <div>
        <h2 className="text-lg font-semibold mb-3">Manage Properties</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Properties can have multiple panels. Custom entity types are shared across all panels in a property.
          </p>

          {allProperties && allProperties.length > 0 ? (
            <div className="space-y-2 mb-4">
              {allProperties.map((prop) => {
                const panelCount = allPanelsForAllProperties?.[prop.id] || 0
                const isCurrent = prop.id === property.id
                const isEditing = editingPropertyId === prop.id

                return (
                  <div
                    key={prop.id}
                    className={`flex items-center justify-between p-3 bg-background rounded border ${
                      isCurrent ? 'border-primary' : 'border-border'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <div className="flex-1 mr-2">
                          <input
                            type="text"
                            value={editingPropertyName}
                            onChange={(e) => setEditingPropertyName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameProperty(prop.id)
                              if (e.key === 'Escape') { setEditingPropertyId(null); setEditingPropertyName('') }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-border rounded text-sm"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRenameProperty(prop.id)}
                            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingPropertyId(null); setEditingPropertyName('') }}
                            className="px-2 py-1 text-xs border border-border rounded hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{prop.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                current
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {panelCount} {panelCount === 1 ? 'panel' : 'panels'}
                          </span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => { setEditingPropertyId(prop.id); setEditingPropertyName(prop.name) }}
                            className="p-1.5 hover:bg-muted rounded transition-colors"
                            title="Rename property"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {allProperties.length > 1 && (
                            <button
                              onClick={() => setPropertyToDelete(prop)}
                              className="px-2 py-1 text-xs border border-destructive text-destructive rounded hover:bg-destructive/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No properties found.</p>
          )}

          <button
            onClick={() => setShowAddPropertyModal(true)}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
          >
            + Add Property
          </button>
        </div>
      </div>
        </div>
      )}

      {/* Panel Tab Content */}
      {activeTab === 'panel' && (
        <div className="space-y-6">
          {/* Current Panel Info Section */}
          <div>
        <h2 className="text-lg font-semibold mb-3">Current Panel</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-5">
          {editingPanelId === panel.id ? (
            <div className="mb-4">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editingPanelName}
                  onChange={(e) => setEditingPanelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenamePanel()
                    if (e.key === 'Escape') { setEditingPanelId(null); setEditingPanelName('') }
                  }}
                  autoFocus
                  className="flex-1 px-3 py-2 border border-border rounded text-base font-semibold"
                />
                <button
                  onClick={handleRenamePanel}
                  className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingPanelId(null); setEditingPanelName('') }}
                  className="px-3 py-2 text-xs border border-border rounded hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-xl font-semibold">{panel.name}</h3>
              <button
                onClick={() => { setEditingPanelId(panel.id); setEditingPanelName(panel.name) }}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Rename panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <div className="text-muted-foreground mb-1">Total Positions</div>
              <div className="text-lg font-semibold">{panel.total_positions}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Main Breaker</div>
              {editingMainBreakerAmperage ? (
                <div className="flex items-center gap-2">
                  <select
                    value={mainBreakerAmperageValue}
                    onChange={(e) => setMainBreakerAmperageValue(Number(e.target.value))}
                    className="px-2 py-1 border border-input rounded bg-background text-sm"
                    autoFocus
                  >
                    <option value={100}>100A</option>
                    <option value={125}>125A</option>
                    <option value={150}>150A</option>
                    <option value={200}>200A</option>
                    <option value={225}>225A</option>
                    <option value={300}>300A</option>
                    <option value={400}>400A</option>
                  </select>
                  <button
                    onClick={handleUpdateMainBreakerAmperage}
                    className="p-1 text-primary hover:text-primary/80"
                    title="Save"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditingMainBreakerAmperage(false)
                      setMainBreakerAmperageValue(panel.main_breaker_amperage)
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">{panel.main_breaker_amperage}A</div>
                  <button
                    onClick={() => setEditingMainBreakerAmperage(true)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Edit main breaker amperage"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenEditLayout}
            className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium"
          >
            Edit Panel Layout
          </button>
        </div>
      </div>

      {/* Backup & Export Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Backup & Export</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Export Panel to PDF</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Generate a printable PDF diagram of this panel. Perfect for walking around the house or sharing with electricians.
            </p>
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isGeneratingPDF ? 'Generating PDF...' : 'Export Panel Diagram (PDF)'}
            </button>
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-2">Export Panel Backup</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Export this panel's data to a JSON file. You can use this to transfer data to another computer or keep as a backup.
            </p>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export Panel Backup'}
            </button>
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-2">Import Panel Backup</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Import a previously exported panel backup file. <strong className="text-destructive">WARNING:</strong> This will delete all current data.
            </p>
            <button
              onClick={handleImportBackup}
              disabled={isImporting}
              className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Panel Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Manage Rooms Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Manage Rooms</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rooms defined yet. Add entities with room assignments to see them here.</p>
          ) : (
            <div className="space-y-2">
              {rooms.map(({ room, count }) => (
                <div key={room} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                  {editingRoom === room ? (
                    <>
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameRoom(room)
                          if (e.key === 'Escape') { setEditingRoom(null); setNewRoomName('') }
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 border border-border rounded text-sm"
                      />
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleRenameRoom(room)}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingRoom(null); setNewRoomName('') }}
                          className="px-2 py-1 text-xs border border-border rounded hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{room}</span>
                        <span className="text-xs text-muted-foreground ml-2">({count} {count === 1 ? 'entity' : 'entities'})</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingRoom(room); setNewRoomName(room) }}
                          className="px-2 py-1 text-xs border border-border rounded hover:bg-muted"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteRoomClick(room)}
                          className="px-2 py-1 text-xs border border-destructive text-destructive rounded hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manage Custom Types Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Manage Custom Types</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Custom types are shared across all panels in this property. Default types (outlet, switch, light, appliance, hvac, other) cannot be modified.
          </p>

          {/* Bulk delete for unused types */}
          {property.custom_entity_types.length > 0 && (() => {
            const unusedTypes = property.custom_entity_types.filter(typeName => {
              const typeInfo = entityTypes.find(t => t.entity_type === typeName)
              return !typeInfo || typeInfo.count === 0
            })

            if (unusedTypes.length > 0) {
              return (
                <div className="mb-4 p-3 bg-background border border-border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">Delete Unused Types</p>
                      <p className="text-xs text-muted-foreground">
                        Remove all custom types that aren't currently used by any entities
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const confirmed = confirm(
                          `Delete ${unusedTypes.length} unused custom types?\n\n${unusedTypes.join(', ')}`
                        )

                        if (!confirmed) return

                        try {
                          for (const typeName of unusedTypes) {
                            await window.electronAPI.properties.removeCustomEntityType(property.id, typeName)
                          }

                          // Invalidate and refetch property data immediately
                          await queryClient.invalidateQueries({
                            queryKey: ['property', property.id],
                            refetchType: 'active'
                          })
                          await queryClient.invalidateQueries({
                            queryKey: ['properties', 'all'],
                            refetchType: 'active'
                          })

                          // Force refetch of property data
                          await refetchProperties()

                          // Reload rooms and types
                          await loadRoomsAndTypes()

                          alert(`Successfully deleted ${unusedTypes.length} unused types.`)
                        } catch (error) {
                          console.error('Failed to delete unused types:', error)
                          alert('Failed to delete unused types')
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                    >
                      Delete All Unused
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {unusedTypes.length} unused {unusedTypes.length === 1 ? 'type' : 'types'} found
                  </p>
                </div>
              )
            }
            return null
          })()}

          {property.custom_entity_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom types defined yet. Add entities with new types to create them.</p>
          ) : (
            <div className="space-y-2">
              {property.custom_entity_types.map((typeName) => {
                const typeInfo = entityTypes.find(t => t.entity_type === typeName)
                const count = typeInfo?.count || 0
                const isEditing = editingType === typeName

                return (
                  <div key={typeName} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={newTypeNameEdit}
                          onChange={(e) => setNewTypeNameEdit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameType(typeName)
                            if (e.key === 'Escape') { setEditingType(null); setNewTypeNameEdit('') }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 border border-border rounded text-sm"
                        />
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleRenameType(typeName)}
                            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingType(null); setNewTypeNameEdit('') }}
                            className="px-2 py-1 text-xs border border-border rounded hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{typeName}</span>
                          <span className="text-xs text-muted-foreground ml-2">({count} {count === 1 ? 'entity' : 'entities'})</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingType(typeName); setNewTypeNameEdit(typeName) }}
                            className="px-2 py-1 text-xs border border-border rounded hover:bg-muted"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteTypeClick(typeName)}
                            className="px-2 py-1 text-xs border border-destructive text-destructive rounded hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add New Custom Type */}
          <div className="mt-3">
            {isAddingNewType ? (
              <div className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value.toLowerCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewType()
                    if (e.key === 'Escape') { setIsAddingNewType(false); setNewTypeName('') }
                  }}
                  placeholder="Enter new type name"
                  autoFocus
                  className="flex-1 px-2 py-1 border border-border rounded text-sm"
                />
                <button
                  onClick={handleAddNewType}
                  disabled={!newTypeName.trim() || isCreatingType}
                  className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatingType ? 'Adding...' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsAddingNewType(false); setNewTypeName('') }}
                  disabled={isCreatingType}
                  className="px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNewType(true)}
                className="w-full px-3 py-2 text-sm border border-dashed border-border rounded hover:bg-muted flex items-center justify-center gap-2"
              >
                <span>+</span>
                <span>Add Custom Type</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Danger Zone</h2>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-4">
          {/* Reset Panel */}
          <div>
            <h3 className="font-semibold text-destructive mb-2">Reset Panel</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Delete all breakers and entities in this panel, but keep the panel itself.
              This action cannot be undone.
            </p>
            <button
              onClick={handleResetClick}
              disabled={isResetting || isDeletingPanel}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 font-medium"
            >
              {isResetting ? 'Resetting...' : 'Reset Panel'}
            </button>
          </div>

          {/* Delete Panel */}
          <div className="border-t border-destructive/20 pt-4">
            <h3 className="font-semibold text-destructive mb-2">Delete Panel</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete this entire panel and all its breakers and entities.
              This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeletePanelConfirm(true)}
              disabled={isResetting || isDeletingPanel}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 font-medium"
            >
              {isDeletingPanel ? 'Deleting...' : 'Delete Panel'}
            </button>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* Confirmation Step 1 Modal */}
      {showConfirmStep1 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
            <h3 className="text-lg font-bold mb-3">Reset Panel?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This will delete <strong>all breakers and entities</strong> in:
            </p>
            <div className="bg-muted/50 border border-border rounded-md p-3 mb-3">
              <p className="text-base font-semibold">
                {panel.name}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              The panel itself will remain and can be reconfigured.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to continue?
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This action cannot be undone
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelStep1}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStep1}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Step 2 Modal */}
      {showConfirmStep2 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
            <h3 className="text-lg font-bold mb-2">Final Confirmation</h3>
            <p className="text-sm text-muted-foreground mb-2">
              You are about to reset:
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-2">
              <p className="text-base font-semibold text-destructive">
                {panel.name}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              All breakers and entities will be deleted. The panel structure will remain.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              To confirm, type the panel name exactly as shown above:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${panel.name}" to confirm`}
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelStep2}
                disabled={isResetting}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStep2}
                disabled={confirmText !== panel.name || isResetting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Reset Panel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[600px] flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Delete Room "{roomToDelete.name}"?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The following {roomToDelete.entities.length} {roomToDelete.entities.length === 1 ? 'entity' : 'entities'} will become unmapped:
              </p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-2">
                {roomToDelete.entities.map((entity) => (
                  <div key={entity.id} className="p-2 bg-muted/30 border border-border rounded text-sm">
                    {entity.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRoom}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Type Confirmation Modal */}
      {typeToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] max-h-[600px] flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Delete Type "{typeToDelete.name}"?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The following {typeToDelete.entities.length} {typeToDelete.entities.length === 1 ? 'entity' : 'entities'} will be changed to "other" type:
              </p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-2">
                {typeToDelete.entities.map((entity) => (
                  <div key={entity.id} className="p-2 bg-muted/30 border border-border rounded text-sm">
                    {entity.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setTypeToDelete(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteType}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Delete Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowAddPropertyModal(false)}
        >
          <div
            className="bg-background border border-border rounded-lg shadow-lg w-[450px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Add New Property</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Property Name</label>
              <input
                type="text"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddProperty()
                  if (e.key === 'Escape') setShowAddPropertyModal(false)
                }}
                placeholder="e.g., Main House, Rental Property"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddPropertyModal(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProperty}
                disabled={isAddingProperty || !newPropertyName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isAddingProperty ? 'Adding...' : 'Add Property'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Confirmation Modal */}
      {propertyToDelete && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPropertyToDelete(null)}
        >
          <div
            className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Delete Property "{propertyToDelete.name}"?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete the property and all its panels, breakers, and entities.
              This action cannot be undone.
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This action cannot be undone
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProperty(propertyToDelete)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Panel Confirmation Modal */}
      {showDeletePanelConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
            <h3 className="text-lg font-bold mb-2">Delete Panel?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              You are about to permanently delete:
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
              <p className="text-base font-semibold text-destructive">
                {panel.name}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              This will delete the panel and all its breakers and entities.
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This action cannot be undone
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              To confirm, type the panel name exactly as shown above:
            </p>
            <input
              type="text"
              value={deletePanelConfirmText}
              onChange={(e) => setDeletePanelConfirmText(e.target.value)}
              placeholder={`Type "${panel.name}" to confirm`}
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeletePanelConfirm(false)
                  setDeletePanelConfirmText('')
                }}
                disabled={isDeletingPanel}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePanel}
                disabled={deletePanelConfirmText !== panel.name || isDeletingPanel}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeletingPanel ? 'Deleting...' : 'Delete Panel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Panel Layout Modal */}
      {showEditPanelLayoutModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => !isUpdatingLayout && setShowEditPanelLayoutModal(false)}
        >
          <div
            className="bg-background border border-border rounded-lg shadow-lg w-[600px] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Edit Panel Layout</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add or remove rows from "{panel.name}"
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-muted/30 border border-border rounded-md p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Current: <strong>{panel.total_positions} positions</strong> ({panel.total_positions / 2} rows)
                  </p>
                  {editLayoutPositions < panel.total_positions && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Removing rows will delete breakers at positions {editLayoutPositions + 1}-{panel.total_positions}
                      </p>
                      <p className="text-xs text-destructive mt-1">
                        Any entities mapped to these breakers will be unmapped (not deleted)
                      </p>
                    </div>
                  )}
                  {editLayoutPositions > panel.total_positions && (
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                      <p className="text-sm text-primary font-medium">
                        Adding {(editLayoutPositions - panel.total_positions) / 2} {(editLayoutPositions - panel.total_positions) / 2 === 1 ? 'row' : 'rows'} (positions {panel.total_positions + 1}-{editLayoutPositions})
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Panel Layout Preview</label>
                  <div className="border border-border rounded-md p-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {Array.from({ length: editLayoutPositions }, (_, i) => {
                        const position = i + 1
                        const isNew = position > panel.total_positions
                        const isRemoved = position > editLayoutPositions

                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-center h-10 border rounded text-xs ${
                              isNew
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border bg-background text-muted-foreground'
                            }`}
                          >
                            Position {position}
                            {isNew && ' (new)'}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        {editLayoutPositions} positions ({editLayoutPositions / 2} rows)
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRemoveLayoutRow}
                          disabled={editLayoutPositions <= 2 || isUpdatingLayout}
                          className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove Row
                        </button>
                        <button
                          type="button"
                          onClick={handleAddLayoutRow}
                          disabled={editLayoutPositions >= 100 || isUpdatingLayout}
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
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEditPanelLayoutModal(false)}
                  disabled={isUpdatingLayout}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLayout}
                  disabled={isUpdatingLayout || editLayoutPositions === panel.total_positions}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdatingLayout ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
