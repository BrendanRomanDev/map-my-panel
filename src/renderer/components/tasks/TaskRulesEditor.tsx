import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Tag, TaskRules } from '@shared/types'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { TAG_COLOR_OPTIONS, tagColorClasses } from '../tags/tagColors'

// The configurable "wiring" shared by the Add-Task and Template editors:
//   - on create: put a tag on the entity
//   - on complete: remove some tags, add some tags, optionally log history
// Tags are loose labels — this component never enforces meaning. Creating a new
// tag (with color + icon) persists immediately (a library action); attaching it
// to a task's rules is just local state the host saves on its own Save.
interface TaskRulesEditorProps {
  propertyId: string
  value: TaskRules
  onChange: (next: TaskRules) => void
}

export function TaskRulesEditor({ propertyId, value, onChange }: TaskRulesEditorProps) {
  const { data: allTags } = useTags(propertyId)
  const tags = allTags || []

  return (
    <div className="space-y-4 border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tag wiring (optional)</p>

      {/* On create */}
      <div>
        <label className="block text-sm font-medium mb-1">When created, tag the entity</label>
        <TagSelect
          propertyId={propertyId}
          tags={tags}
          selected={value.on_create_tag_id ? [value.on_create_tag_id] : []}
          multi={false}
          onChange={ids => onChange({ ...value, on_create_tag_id: ids[0] ?? null })}
          emptyLabel="No tag on create"
        />
      </div>

      {/* On complete: remove */}
      <div>
        <label className="block text-sm font-medium mb-1">When completed, remove tags</label>
        <TagSelect
          propertyId={propertyId}
          tags={tags}
          selected={value.on_complete_remove_tag_ids}
          multi
          onChange={ids => onChange({ ...value, on_complete_remove_tag_ids: ids })}
          emptyLabel="Remove nothing"
        />
      </div>

      {/* On complete: add */}
      <div>
        <label className="block text-sm font-medium mb-1">When completed, add tags</label>
        <TagSelect
          propertyId={propertyId}
          tags={tags}
          selected={value.on_complete_add_tag_ids}
          multi
          onChange={ids => onChange({ ...value, on_complete_add_tag_ids: ids })}
          emptyLabel="Add nothing"
        />
      </div>

      {/* On complete: history */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.on_complete_log_history}
          onChange={e => onChange({ ...value, on_complete_log_history: e.target.checked })}
        />
        When completed, log a history event on the entity
      </label>
    </div>
  )
}

// Compact tag chooser. Click a tag to toggle it; in single mode picking one
// clears the rest. Inline "+ New tag" creates a tag with name + color + icon
// and immediately selects it.
function TagSelect({
  propertyId,
  tags,
  selected,
  multi,
  onChange,
  emptyLabel
}: {
  propertyId: string
  tags: Tag[]
  selected: string[]
  multi: boolean
  onChange: (ids: string[]) => void
  emptyLabel: string
}) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>('gray')
  const [icon, setIcon] = useState('')
  const selectedSet = new Set(selected)

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange(multi ? [...selected, id] : [id])
    }
  }

  const createTag = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const tag = await window.electronAPI.tags.create({
      property_id: propertyId,
      name: trimmed,
      color,
      icon: icon.trim() || null
    })
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.byProperty(propertyId) })
    onChange(multi ? [...selected, tag.id] : [tag.id])
    setName(''); setIcon(''); setColor('gray'); setCreating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet — create one below.</span>}
        {tags.map(tag => {
          const isSelected = selectedSet.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`px-2 py-0.5 rounded text-xs font-medium ${tagColorClasses(tag.color)} ${
                isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'
              }`}
              title={tag.description || tag.name}
            >
              {tag.icon ? `${tag.icon} ` : ''}{tag.name}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && <span className="text-xs text-muted-foreground">{emptyLabel}</span>}

      {!creating ? (
        <button type="button" onClick={() => setCreating(true)} className="text-xs text-primary hover:underline">
          + New tag
        </button>
      ) : (
        <div className="space-y-2 border border-border rounded p-2">
          <div className="flex items-center gap-1">
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="🔌"
              maxLength={2}
              className="w-10 text-center text-sm px-1 py-1 rounded border border-border bg-background"
            />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTag() }}
              placeholder="New tag name..."
              className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-1">
            {TAG_COLOR_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded ${tagColorClasses(c)} ${color === c ? 'ring-2 ring-primary' : ''}`}
                title={c}
              />
            ))}
          </div>
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => { setCreating(false); setName('') }} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={createTag} disabled={!name.trim()} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
