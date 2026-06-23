import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TargetType } from '@shared/types'
import { useTags, useTagsForTarget } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TagBadge } from './TagBadge'

interface TagPickerProps {
  targetType: TargetType
  targetId: string
  propertyId: string
}

// Inline tag editor for a target: shows attached tags (removable), lets the
// user attach existing tags, and create a new tag on the fly.
export function TagPicker({ targetType, targetId, propertyId }: TagPickerProps) {
  const queryClient = useQueryClient()
  const { data: attachedTags } = useTagsForTarget(targetType, targetId)
  const { data: allTags } = useTags(propertyId)
  const [newTagName, setNewTagName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const attachedIds = new Set((attachedTags || []).map(t => t.id))
  const available = (allTags || []).filter(t => !attachedIds.has(t.id))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byTarget(targetType, targetId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byProperty(propertyId) })
  }

  const handleAttach = async (tagId: string) => {
    await window.electronAPI.tags.attach(tagId, targetType, targetId)
    invalidate()
  }

  const handleDetach = async (tagId: string) => {
    await window.electronAPI.tags.detach(tagId, targetType, targetId)
    invalidate()
  }

  const handleCreateAndAttach = async () => {
    const name = newTagName.trim()
    if (!name) return
    const tag = await window.electronAPI.tags.create({ property_id: propertyId, name })
    await window.electronAPI.tags.attach(tag.id, targetType, targetId)
    setNewTagName('')
    setIsAdding(false)
    invalidate()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {(attachedTags || []).map(tag => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => handleDetach(tag.id)} />
        ))}
        {(!attachedTags || attachedTags.length === 0) && (
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
                if (e.key === 'Enter') handleCreateAndAttach()
              }}
              placeholder="New tag name..."
              className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background"
              autoFocus
            />
            <button
              onClick={handleCreateAndAttach}
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
