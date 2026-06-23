import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Tag } from '@shared/types'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TagBadge } from '../tags/TagBadge'
import { TAG_COLOR_OPTIONS, tagColorClasses } from '../tags/tagColors'

interface TagManagerProps {
  propertyId: string
}

interface TagDraft {
  name: string
  description: string
  icon: string
  color: string
  condense: boolean
}

const EMPTY_DRAFT: TagDraft = { name: '', description: '', icon: '', color: 'gray', condense: false }

export function TagManager({ propertyId }: TagManagerProps) {
  const queryClient = useQueryClient()
  const { data: tags } = useTags(propertyId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TagDraft>(EMPTY_DRAFT)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ tag: Tag; usageCount: number } | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byProperty(propertyId) })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setIsCreating(false)
    setDraft({
      name: tag.name,
      description: tag.description || '',
      icon: tag.icon || '',
      color: tag.color || 'gray',
      condense: tag.condense
    })
  }

  const startCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setDraft(EMPTY_DRAFT)
  }

  const handleSave = async () => {
    const name = draft.name.trim()
    if (!name) return
    const payload = {
      name,
      description: draft.description.trim() || null,
      icon: draft.icon.trim() || null,
      color: draft.color,
      condense: draft.condense
    }
    if (isCreating) {
      await window.electronAPI.tags.create({ property_id: propertyId, ...payload })
    } else if (editingId) {
      await window.electronAPI.tags.update(editingId, payload)
    }
    invalidate()
    cancelEdit()
  }

  const requestDelete = async (tag: Tag) => {
    const links = await window.electronAPI.tags.listTargetsForTag(tag.id)
    setDeleteTarget({ tag, usageCount: links.length })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await window.electronAPI.tags.delete(deleteTarget.tag.id)
    invalidate()
    setDeleteTarget(null)
  }

  const renderEditor = () => (
    <div className="border border-border rounded p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Name</label>
          <input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="w-full text-sm px-2 py-1 rounded border border-border bg-background"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Icon (emoji)</label>
          <input
            value={draft.icon}
            onChange={e => setDraft({ ...draft, icon: e.target.value })}
            placeholder="e.g. 🍴"
            className="w-full text-sm px-2 py-1 rounded border border-border bg-background"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <input
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
          placeholder="Shown on hover"
          className="w-full text-sm px-2 py-1 rounded border border-border bg-background"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Color</label>
        <div className="flex flex-wrap gap-1">
          {TAG_COLOR_OPTIONS.map(color => (
            <button
              key={color}
              onClick={() => setDraft({ ...draft, color })}
              className={`px-2 py-0.5 rounded text-xs font-medium ${tagColorClasses(color)} ${
                draft.color === color ? 'ring-2 ring-primary' : ''
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.condense}
          onChange={e => setDraft({ ...draft, condense: e.target.checked })}
        />
        Condense to icon on crowded cards
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Preview:</span>
        <TagBadge
          tag={{
            id: 'preview',
            property_id: propertyId,
            name: draft.name || 'Tag name',
            description: draft.description || null,
            icon: draft.icon || null,
            color: draft.color,
            condense: false,
            created_at: new Date(),
            updated_at: new Date()
          }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!draft.name.trim()}
          className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
        >
          {isCreating ? 'Create Tag' : 'Save'}
        </button>
        <button
          onClick={cancelEdit}
          className="text-xs px-3 py-1 rounded border border-border hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Manage Tags</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Tags can be attached to breakers and entities. Editing a tag updates it everywhere it's
        used. Default tags can be edited or deleted.
      </p>

      <div className="space-y-2">
        {(tags || []).map(tag =>
          editingId === tag.id ? (
            <div key={tag.id}>{renderEditor()}</div>
          ) : (
            <div
              key={tag.id}
              className="flex items-center justify-between gap-2 p-2 border border-border rounded"
            >
              <div className="flex items-center gap-2 min-w-0">
                <TagBadge tag={tag} />
                {tag.property_id === null && (
                  <span className="text-xs text-muted-foreground">(global)</span>
                )}
                {tag.description && (
                  <span className="text-xs text-muted-foreground truncate">{tag.description}</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(tag)}
                  className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => requestDelete(tag)}
                  className="text-xs px-2 py-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-3">
        {isCreating ? renderEditor() : (
          <button
            onClick={startCreate}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
          >
            + Add Tag
          </button>
        )}
      </div>

      {/* Delete confirmation with usage count */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Delete tag "{deleteTarget.tag.name}"?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {deleteTarget.usageCount === 0
                ? 'This tag is not currently attached to anything.'
                : `This tag is attached to ${deleteTarget.usageCount} ${
                    deleteTarget.usageCount === 1 ? 'item' : 'items'
                  }. Deleting it will remove it from all of them. This can't be undone.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="text-sm px-3 py-1.5 rounded bg-destructive text-destructive-foreground"
              >
                Delete Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
