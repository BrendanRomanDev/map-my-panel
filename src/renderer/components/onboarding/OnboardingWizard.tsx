import { useState } from 'react'
import type { Property, Panel } from '@shared/types'
import { Step0ChoiceScreen } from './Step0ChoiceScreen'
import { Step1AddRooms } from './Step1AddRooms'
import { Step2AddEntities } from './Step2AddEntities'
import { Step3ConfigurePanel } from './Step3ConfigurePanel'
import { Step4ReadyToMap } from './Step4ReadyToMap'

interface OnboardingWizardProps {
  onComplete: (property: Property, panel: Panel) => void
}

export type OnboardingData = {
  propertyName: string
  rooms: string[]
  entities: Array<{
    name: string
    entity_type: 'outlet' | 'switch' | 'light' | 'appliance' | 'hvac' | 'other'
    room: string | null
    location: string | null
  }>
  panelName: string
  totalPositions: number
  mainBreakerAmperage: number
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0) // Start at step 0 for choice screen
  const [isImporting, setIsImporting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    propertyName: 'My Property',
    rooms: [],
    entities: [],
    panelName: 'Main Panel',
    totalPositions: 24,
    mainBreakerAmperage: 200
  })

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleCreateNew = () => {
    setCurrentStep(1)
  }

  const handleRestore = async () => {
    setIsImporting(true)
    try {
      const result = await window.electronAPI.backup.import()
      if (result.success) {
        // Get the current property and panel from the imported data
        const [property, panel] = await Promise.all([
          window.electronAPI.properties.getCurrentOrNull(),
          window.electronAPI.panels.getCurrentOrNull()
        ])

        if (property && panel) {
          onComplete(property, panel)
        } else {
          alert('No property or panel found in backup file')
          setIsImporting(false)
        }
      } else {
        alert(result.message || 'Failed to import backup')
        setIsImporting(false)
      }
    } catch (error) {
      alert('Error importing backup: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Map My Panel</h1>
          <p className="text-muted-foreground">
            {currentStep === 0
              ? 'Choose how you want to get started'
              : "Let's set up your electrical panel in 4 easy steps"}
          </p>
        </div>

        {/* Progress indicator - only show for steps 1-4 */}
        {currentStep >= 1 && (
          <div className="flex justify-between mb-8">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`flex-1 h-2 mx-1 rounded ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
          {currentStep === 0 && (
            <Step0ChoiceScreen
              onCreateNew={handleCreateNew}
              onRestore={handleRestore}
              isImporting={isImporting}
            />
          )}
          {currentStep === 1 && (
            <Step1AddRooms
              rooms={data.rooms}
              onUpdate={rooms => updateData({ rooms })}
              onNext={nextStep}
            />
          )}
          {currentStep === 2 && (
            <Step2AddEntities
              rooms={data.rooms}
              entities={data.entities}
              onUpdate={entities => updateData({ entities })}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 3 && (
            <Step3ConfigurePanel
              propertyName={data.propertyName}
              panelName={data.panelName}
              totalPositions={data.totalPositions}
              mainBreakerAmperage={data.mainBreakerAmperage}
              onUpdate={(propertyName, panelName, totalPositions, mainBreakerAmperage) =>
                updateData({ propertyName, panelName, totalPositions, mainBreakerAmperage })
              }
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 4 && (
            <Step4ReadyToMap
              data={data}
              onComplete={onComplete}
              onBack={prevStep}
            />
          )}
        </div>

        {/* Step indicator - only show for steps 1-4 */}
        {currentStep >= 1 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Step {currentStep} of 4
          </div>
        )}
      </div>
    </div>
  )
}
