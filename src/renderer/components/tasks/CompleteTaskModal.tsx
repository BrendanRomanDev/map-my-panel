import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TaskWithEntity, Tag } from '@shared/types'
import { queryKeys } from '../../lib/queryKeys'

interface CompleteTaskModalProps {
  task: TaskWithEntity
  propertyId: string
  panelId: string
  onClose: () => void
  onDone: () => void
}

function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Guided completion: proposes the side-effects (tag flips + optional history
// event) for the user to confirm/edit before applying. Never auto-applies.
export function CompleteTaskModal({ task, propertyId, panelId, onClose, onDone }: CompleteTaskModalProps) {
  const queryClient = useQueryClient()
  const isSelfGround = task.task_type === 'Self-Ground'
  const isMapCircuit = task.task_type === 'Map Circuit'

  // Side-effect toggles (defaults depend on task type)
  const [applyTagChanges, setApplyTagChanges] = useState(isSelfGround)
  const [logHistory, setLogHistory] = useState(true)
  const [historyNote, setHistoryNote] = useState(task.title)
  const [currentTags, setCurrentTags] = useState<Tag[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.electronAPI.tags.listForTarget('entity', task.entity_id).then(setCurrentTags)
  }, [task.entity_id])

  const tagNames = new Set(currentTags.map(t => t.name.toLowerCase()))
  // For Self-Ground: what we'll remove / add
  const toRemove = ['Needs Grounding', '2P'].filter(n => tagNames.has(n.toLowerCase()))
  const toAdd = ['Grounded to Box (Self-Grounding)', '3P'].filter(n => !tagNames.has(n.toLowerCase()))

  const apply = async () => {
    setSaving(true)
    try {
      // 1) Tag changes (Self-Ground)
      if (isSelfGround && applyTagChanges) {
        const propTags = await window.electronAPI.tags.listForProperty(propertyId)
        const byName = (n: string) => propTags.find(t => t.name.toLowerCase() === n.toLowerCase())
        for (const name of toRemove) {
          const tag = byName(name)
          if (tag) await window.electronAPI.tags.detach(tag.id, 'entity', task.entity_id)
        }
        for (const name of toAdd) {
          let tag = byName(name)
          if (!tag) tag = await window.electronAPI.tags.create({ property_id: propertyId, name })
          await window.electronAPI.tags.attach(tag.id, 'entity', task.entity_id)
        }
      }

      // 2) Optional history event on the entity
      if (logHistory) {
        await window.electronAPI.history.createEvent({
          property_id: propertyId,
          event_type_id: null,
          notes: historyNote.trim() || task.title,
          occurred_on: todayYmd(),
          targets: [{ target_type: 'entity', target_id: task.entity_id }]
        })
      }

      // 3) Mark the task done
      await window.electronAPI.tasks.complete(task.id)

      // Refresh everything touched
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.byTarget('entity', task.entity_id) })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.byPanel(panelId) })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 p-6 pb-3 border-b border-border">
          <h3 className="text-lg font-bold">Complete task</h3>
          <p className="text-sm text-muted-foreground mt-1">{task.title} — {task.entity_name}</p>
        </div>

        <div className="flex-1 overflow-auto p-6 py-4 space-y-3">
          {isSelfGround && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={applyTagChanges} onChange={e => setApplyTagChanges(e.target.checked)} className="mt-0.5" />
              <span>
                Update grounding tags
                <span className="block text-xs text-muted-foreground">
                  {toRemove.length ? `Remove: ${toRemove.join(', ')}. ` : ''}{toAdd.length ? `Add: ${toAdd.join(', ')}.` : ''}
                  {!toRemove.length && !toAdd.length ? 'No tag changes needed.' : ''}
                </span>
              </span>
            </label>
          )}

          {isMapCircuit && (
            <p className="text-sm text-muted-foreground">
              After completing, assign this entity to its breaker from the entity's edit screen.
            </p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={logHistory} onChange={e => setLogHistory(e.target.checked)} className="mt-0.5" />
            <span>
              Log a history event (today)
              {logHistory && (
                <input
                  value={historyNote}
                  onChange={e => setHistoryNote(e.target.value)}
                  className="block w-full mt-1 text-xs px-2 py-1 rounded border border-border bg-background"
                />
              )}
            </span>
          </label>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          <button onClick={apply} disabled={saving} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? 'Completing…' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
