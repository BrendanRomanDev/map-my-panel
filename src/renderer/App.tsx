import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { MainLayout } from './components/layout/MainLayout'
import type { Property, Panel } from '@shared/types'

export function App() {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null)
  const [currentPanel, setCurrentPanel] = useState<Panel | null>(null)
  const queryClient = useQueryClient()

  // Query to check if a property exists
  const { data: existingProperty, isLoading: isLoadingProperty, error: propertyError } = useQuery({
    queryKey: ['property', 'current'],
    queryFn: () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }
      return window.electronAPI.properties.getCurrentOrNull()
    },
    retry: false
  })

  // Query to get current panel (only runs if we have a property)
  const { data: existingPanel, isLoading: isLoadingPanel } = useQuery({
    queryKey: ['panel', 'current'],
    queryFn: () => window.electronAPI.panels.getCurrentOrNull(),
    enabled: !!existingProperty,
    retry: false
  })

  useEffect(() => {
    if (existingProperty) {
      setCurrentProperty(existingProperty)
    }
    if (existingPanel) {
      setCurrentPanel(existingPanel)
    }
  }, [existingProperty, existingPanel])

  const handlePanelReset = async () => {
    // Clear current panel
    setCurrentPanel(null)

    // Re-fetch to check if any panels remain in the property
    queryClient.invalidateQueries({ queryKey: ['panel', 'current'] })

    // Force a refetch to get the latest panel state
    const updatedPanel = await queryClient.fetchQuery({
      queryKey: ['panel', 'current'],
      queryFn: () => window.electronAPI.panels.getCurrentOrNull()
    })

    // Update state based on what we found
    setCurrentPanel(updatedPanel)
  }

  const handlePropertyChange = async (property: Property) => {
    setCurrentProperty(property)
    // Switch to this property's first panel
    await window.electronAPI.properties.setAsCurrent(property.id)

    // Refetch panel
    const panel = await window.electronAPI.panels.getCurrentOrNull()
    setCurrentPanel(panel)

    queryClient.invalidateQueries()
  }

  const handlePanelChange = (panel: Panel) => {
    setCurrentPanel(panel)
  }

  // Check for errors
  if (propertyError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-destructive mb-2">Error Loading Application</div>
          <div className="text-sm text-muted-foreground">
            {propertyError instanceof Error ? propertyError.message : 'Unknown error'}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Please restart the application
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingProperty || isLoadingPanel) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show onboarding if no property or panel exists
  if (!currentProperty || !currentPanel) {
    return (
      <OnboardingWizard
        onComplete={(property, panel) => {
          setCurrentProperty(property)
          setCurrentPanel(panel)
          queryClient.invalidateQueries()
        }}
      />
    )
  }

  // Show main application
  return (
    <MainLayout
      property={currentProperty}
      panel={currentPanel}
      onPropertyChange={handlePropertyChange}
      onPanelChange={handlePanelChange}
      onPanelReset={handlePanelReset}
    />
  )
}
