import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Property, Panel } from '@shared/types'
import { ByRoomView } from '../entities/ByRoomView'
import { ByBreakerView } from '../entities/ByBreakerView'
import { BreakerPanelGrid } from '../breaker-panel/BreakerPanelGrid'
import { SettingsView } from '../settings/SettingsView'
import { AddEntityModal } from '../entities/AddEntityModal'
import { AddPanelModal } from '../property/AddPanelModal'
import { PropertySelectorModal } from '../property/PropertySelectorModal'
import { PanelSelectorModal } from '../property/PanelSelectorModal'
import { queryKeys } from '../../lib/queryKeys'

interface MainLayoutProps {
  propertyId: string
  panelId: string
  onPropertyChange: (propertyId: string) => void
  onPanelChange: (panelId: string) => void
  onPanelReset: () => void
}

type GroupingType = 'room' | 'breaker'

export function MainLayout({ propertyId, panelId, onPropertyChange, onPanelChange, onPanelReset }: MainLayoutProps) {
  const queryClient = useQueryClient()

  // All useState hooks MUST be called before any conditional returns
  const [grouping, setGrouping] = useState<GroupingType>('room')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddEntityModal, setShowAddEntityModal] = useState(false)
  const [showAddPanelModal, setShowAddPanelModal] = useState(false)
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [showPanelModal, setShowPanelModal] = useState(false)

  // Query for property and panel data using IDs
  const { data: property, isLoading: isLoadingProperty, isError: isErrorProperty } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => window.electronAPI.properties.findById(propertyId),
    enabled: !!propertyId
  })

  const { data: panel, isLoading: isLoadingPanel, isError: isErrorPanel } = useQuery({
    queryKey: ['panel', panelId],
    queryFn: () => window.electronAPI.panels.findById(panelId),
    enabled: !!panelId
  })

  // Fetch all properties
  const { data: allProperties, refetch: refetchProperties } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => window.electronAPI.properties.findAll()
  })

  // Fetch all panels for the current property
  const { data: propertyPanels, refetch: refetchPanels, isLoading: isLoadingPanels } = useQuery({
    queryKey: ['panels', 'byProperty', propertyId],
    queryFn: () => window.electronAPI.panels.findByProperty(propertyId),
    enabled: !!propertyId
  })

  // Get all entities to extract unique rooms and types
  const { data: allEntities } = useQuery({
    queryKey: queryKeys.entities.byPanel(panelId),
    queryFn: () => window.electronAPI.entities.listByPanel(panelId),
    enabled: !!panelId
  })

  // Default entity types (includes "other" as fallback for deleted types)
  const defaultTypes = ['outlet', 'switch', 'light', 'appliance', 'hvac', 'other']

  // Extract unique entity types from entities and combine with property's custom types
  const availableEntityTypes = useMemo(() => {
    const allTypes = new Set<string>(defaultTypes)

    // Add property's custom entity types
    if (property?.custom_entity_types) {
      property.custom_entity_types.forEach(type => allTypes.add(type))
    }

    // Add any types found in existing entities (in case some were created before)
    if (allEntities) {
      allEntities.forEach(entity => {
        if (entity.entity_type) {
          allTypes.add(entity.entity_type)
        }
      })
    }

    return Array.from(allTypes).sort()
  }, [property?.custom_entity_types, allEntities])

  // Build entity type filter options
  const entityTypes = useMemo(() => {
    const options = [{ value: 'all', label: 'All Types' }]

    // Add each available type (capitalize first letter for display)
    availableEntityTypes.forEach(type => {
      options.push({
        value: type,
        label: type.charAt(0).toUpperCase() + type.slice(1)
      })
    })

    return options
  }, [availableEntityTypes])

  // Extract unique rooms from entities
  const availableRooms = useMemo(() => {
    if (!allEntities) return []
    const rooms = new Set(
      allEntities
        .map(e => e.room)
        .filter((room): room is string => room !== null && room.trim() !== '')
    )
    return Array.from(rooms).sort()
  }, [allEntities])

  // Early return if data is loading or error
  if (isLoadingProperty || isLoadingPanel || isLoadingPanels) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (isErrorProperty || isErrorPanel || !property || !panel) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">Error loading data. Please refresh the page.</div>
      </div>
    )
  }

  const handlePropertySelect = async (propertyId: string) => {
    await window.electronAPI.properties.setAsCurrent(propertyId)

    // Get all panels for this property
    const panels = await window.electronAPI.panels.findByProperty(propertyId)

    // Always update property
    onPropertyChange(propertyId)

    if (panels && panels.length > 0) {
      // Switch to first panel of the new property
      const firstPanel = panels[0]
      onPanelChange(firstPanel.id)

      // Invalidate all queries related to panels, breakers, and entities
      queryClient.invalidateQueries({ queryKey: ['panels'] })
      queryClient.invalidateQueries({ queryKey: ['breakers'] })
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    }
    // If no panels, don't call onPanelChange - the UI will handle the "no panels" state
  }

  const handlePanelSelect = (panelId: string) => {
    onPanelChange(panelId)

    // Invalidate queries for breakers and entities when switching panels
    queryClient.invalidateQueries({ queryKey: ['breakers', 'byPanel', panelId] })
    queryClient.invalidateQueries({ queryKey: ['entities', 'byPanel', panelId] })
    queryClient.invalidateQueries({ queryKey: ['entities', 'byRoom', panelId] })
  }

  const handlePanelAdded = async () => {
    await refetchPanels()
    // Switch to the newly created panel
    const panels = await window.electronAPI.panels.findByProperty(propertyId)
    if (panels && panels.length > 0) {
      const newPanel = panels[panels.length - 1]
      onPanelChange(newPanel.id)
    }
  }

  const handlePropertyChangeFromSettings = (newPropertyId: string, newPanelId: string) => {
    onPropertyChange(newPropertyId)
    onPanelChange(newPanelId)
  }

  const groupingOptions = [
    { id: 'room' as const, label: 'By Room' },
    { id: 'breaker' as const, label: 'By Breaker' }
  ]

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!showSettings ? (
              <div className="flex items-center gap-2">
                {allProperties && allProperties.length > 1 && (
                  <button
                    onClick={() => setShowPropertyModal(true)}
                    className="px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <div className="text-xs text-muted-foreground">Property</div>
                    <div className="text-base font-bold">{property.name}</div>
                  </button>
                )}

                {propertyPanels && propertyPanels.length > 0 && (
                  <button
                    onClick={() => setShowPanelModal(true)}
                    className="px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <div className="text-xs text-muted-foreground">Panel</div>
                    <div className="text-base font-bold">{panel.name}</div>
                  </button>
                )}
              </div>
            ) : (
              <h1 className="text-xl font-bold">Settings</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title={showSettings ? 'Back to Panel' : 'Settings'}
            >
              {showSettings ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {showSettings ? (
          /* Settings View - Full Width */
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <SettingsView
                propertyId={property.id}
                panelId={panel.id}
                onReset={onPanelReset}
                onPropertyChange={handlePropertyChangeFromSettings}
              />
            </div>
          </div>
        ) : propertyPanels && propertyPanels.length > 0 ? (
          <>
            {/* Sidebar */}
            <aside className="w-80 border-r border-border bg-muted/30 flex flex-col">
              {/* Grouping & Filters */}
              <div className="p-3 border-b border-border">
                {/* Grouping Tabs */}
                <div className="flex gap-1 mb-3">
                  {groupingOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setGrouping(option.id)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                        grouping === option.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Filters - Type and Room */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-xs"
                  >
                    {entityTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-xs"
                  >
                    <option value="all">All Rooms</option>
                    {availableRooms.map(room => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-auto p-4">
                {grouping === 'room' && <ByRoomView panelId={panel.id} typeFilter={entityTypeFilter} roomFilter={roomFilter} />}
                {grouping === 'breaker' && <ByBreakerView panelId={panel.id} typeFilter={entityTypeFilter} roomFilter={roomFilter} />}
              </div>

              {/* Sticky Add Entity Button */}
              <div className="p-4 border-t border-border bg-background">
                <button
                  onClick={() => setShowAddEntityModal(true)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
                >
                  + Add Entity
                </button>
              </div>
            </aside>

            {/* Main panel view */}
            <main className="flex-1 p-6 overflow-auto">
              <BreakerPanelGrid panelId={panel.id} />
            </main>
          </>
        ) : (
          /* No Panels - Empty State */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">No Panels Yet</h2>
              <p className="text-muted-foreground mb-6">
                This property doesn't have any panels. Create your first panel to start mapping your electrical system.
              </p>
              <button
                onClick={() => setShowAddPanelModal(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
              >
                + Add Panel
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Add Entity Modal - only when we have panels */}
      {propertyPanels && propertyPanels.length > 0 && (
        <AddEntityModal
          panelId={panel.id}
          isOpen={showAddEntityModal}
          onClose={() => setShowAddEntityModal(false)}
        />
      )}

      {/* Add Panel Modal */}
      <AddPanelModal
        propertyId={property.id}
        isOpen={showAddPanelModal}
        onClose={() => setShowAddPanelModal(false)}
        onSuccess={handlePanelAdded}
        existingPanels={propertyPanels || []}
      />

      {/* Property Selector Modal - only when multiple properties exist */}
      {allProperties && allProperties.length > 1 && (
        <PropertySelectorModal
          isOpen={showPropertyModal}
          onClose={() => setShowPropertyModal(false)}
          currentProperty={property}
          allProperties={allProperties || []}
          onPropertySelect={handlePropertySelect}
        />
      )}

      {/* Panel Selector Modal - only when we have panels */}
      {propertyPanels && propertyPanels.length > 0 && (
        <PanelSelectorModal
          isOpen={showPanelModal}
          onClose={() => setShowPanelModal(false)}
          currentPanel={panel}
          propertyPanels={propertyPanels}
          propertyName={property.name}
          onPanelSelect={handlePanelSelect}
          onAddPanel={() => setShowAddPanelModal(true)}
        />
      )}
    </div>
  )
}
