import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { MainLayout } from './components/layout/MainLayout'
import type { Panel } from '@shared/types'

export function App() {
  const [currentPanel, setCurrentPanel] = useState<Panel | null>(null)
  const queryClient = useQueryClient()

  // Query to check if a panel already exists
  const { data: existingPanel, isLoading, error } = useQuery({
    queryKey: ['panel', 'current'],
    queryFn: () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }
      return window.electronAPI.panels.getCurrentOrNull()
    },
    retry: false
  })

  useEffect(() => {
    if (existingPanel) {
      setCurrentPanel(existingPanel)
    }
  }, [existingPanel])

  const handlePanelReset = () => {
    // Clear current panel and invalidate query to return to onboarding
    setCurrentPanel(null)
    queryClient.invalidateQueries({ queryKey: ['panel', 'current'] })
  }

  // Check for errors
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-destructive mb-2">Error Loading Application</div>
          <div className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Please restart the application
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show onboarding if no panel exists
  if (!currentPanel) {
    return <OnboardingWizard onComplete={setCurrentPanel} />
  }

  // Show main application
  return <MainLayout panel={currentPanel} onPanelReset={handlePanelReset} />
}
