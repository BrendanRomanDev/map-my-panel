import { useState } from 'react'
import type { Panel } from '@shared/types'

interface SettingsViewProps {
  panel: Panel
  onReset: () => void
}

export function SettingsView({ panel, onReset }: SettingsViewProps) {
  const [showConfirmStep1, setShowConfirmStep1] = useState(false)
  const [showConfirmStep2, setShowConfirmStep2] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

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
    if (confirmText !== 'DELETE') return

    setIsResetting(true)
    try {
      const result = await window.electronAPI.panels.reset(panel.id)
      console.log(`Reset complete: ${result.entitiesDeleted} entities and ${result.breakersDeleted} breakers deleted`)

      // Call parent callback to trigger return to onboarding
      onReset()
    } catch (error) {
      console.error('Failed to reset panel:', error)
      alert('Failed to reset panel. Please try again.')
    } finally {
      setIsResetting(false)
      setShowConfirmStep2(false)
      setConfirmText('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Panel Info Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Panel Information</h2>
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Panel Name</span>
            <span className="text-sm font-medium">{panel.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Positions</span>
            <span className="text-sm font-medium">{panel.total_positions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Main Breaker</span>
            <span className="text-sm font-medium">{panel.main_breaker_amperage}A</span>
          </div>
        </div>
      </div>

      {/* Reset Panel Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Danger Zone</h2>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <h3 className="font-semibold text-destructive mb-2">Reset Panel</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete all breakers and entities in this panel.
            This action cannot be undone.
          </p>
          <button
            onClick={handleResetClick}
            disabled={isResetting}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 font-medium"
          >
            Reset Panel
          </button>
        </div>
      </div>

      {/* Confirmation Step 1 Modal */}
      {showConfirmStep1 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
            <h3 className="text-lg font-bold mb-2">Reset Panel?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will delete <strong>all breakers and entities</strong> in "{panel.name}".
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
            <p className="text-sm text-muted-foreground mb-4">
              To confirm, type <strong className="text-destructive">DELETE</strong> in the box below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
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
                disabled={confirmText !== 'DELETE' || isResetting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Reset Panel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
