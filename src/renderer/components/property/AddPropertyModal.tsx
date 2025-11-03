import { useState } from 'react'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [propertyName, setPropertyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!propertyName.trim()) {
      setError('Property name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await window.electronAPI.properties.create({
        name: propertyName.trim()
      })

      setPropertyName('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setPropertyName('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[500px] p-6">
        <h3 className="text-lg font-bold mb-4">Add New Property</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Property Name</label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g., My House, Rental Property, Beach House"
              autoFocus
              disabled={isCreating}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can add panels to this property after creating it
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !propertyName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
