import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TagBadge } from './TagBadge'

interface TagPickerProps {
  propertyId: string
  // Controlled: the parent owns the pending selection so attach/detach only
  // persist when the host modal/drawer's "Save Changes" runs. Selecting here
  // does NOT hit the database — it mutates local state via onChange.
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function TagPicker({ propertyId, selectedTagIds, onChange }: TagPickerProps) {
  const queryClient = useQueryClient()
  const { data: allTags } = useTags(propertyId)
  const [newTagName, setNewTagName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const selectedSet = new Set(selectedTagIds)
  const selectedTags = (allTags || []).filter(t => selectedSet.has(t.id))
  const available = (allTags || []).filter(t => !selectedSet.has(t.id))

  const handleAttach = (tagId: string) => {
    onChange([...selectedTagIds, tagId])
  }

  const handleDetach = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId))
  }

  // Creating a new tag definition is a library action (like adding a custom
  // entity type), so it persists immediately. Attaching it to THIS target is
  // still staged locally and only saved on the host's Save Changes.
  const handleCreateAndStage = async () => {
    const name = newTagName.trim()
    if (!name) return
    const tag = await window.electronAPI.tags.create({ property_id: propertyId, name })
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byProperty(propertyId) })
    onChange([...selectedTagIds, tag.id])
    setNewTagName('')
    setIsAdding(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {selectedTags.map(tag => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => handleDetach(tag.id)} />
        ))}
        {selectedTags.length === 0 && (
          <span className="text-xs text-muted-foreground">No tags yet</span>
        )}
      </div>

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          + Add tag
        </button>
      ) : (
        <div className="space-y-2 border border-border rounded p-2">
          {available.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {available.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleAttach(tag.id)}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-muted hover:bg-secondary text-foreground"
                  title={tag.description || tag.name}
                >
                  {tag.icon ? `${tag.icon} ` : ''}
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateAndStage()
              }}
              placeholder="New tag name..."
              className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background"
              autoFocus
            />
            <button
              onClick={handleCreateAndStage}
              disabled={!newTagName.trim()}
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsAdding(false)
                setNewTagName('')
              }}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
