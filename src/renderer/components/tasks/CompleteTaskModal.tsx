import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TaskWithTarget } from '@shared/types'
import { useTags } from '../../hooks/useTags'
import { queryKeys } from '../../lib/queryKeys'
import { tagColorClasses } from '../tags/tagColors'

interface CompleteTaskModalProps {
  task: TaskWithTarget
  propertyId: string
  onClose: () => void
  onDone: () => void
}

// Guided completion driven entirely by the task's stored rules — no hardcoded
// task-type branches. Shows exactly which tags will flip and lets the user
// confirm/skip each side-effect before applying. The backend applies the
// confirmed subset (to the task's own target) in one transaction.
export function CompleteTaskModal({ task, propertyId, onClose, onDone }: CompleteTaskModalProps) {
  const queryClient = useQueryClient()
  const { data: allTags } = useTags(propertyId)
  const tags = allTags || []
  const nameOf = (id: string) => tags.find(t => t.id === id)
  const tagChip = (id: string) => {
    const tag = nameOf(id)
    if (!tag) return null
    return (
      <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${tagColorClasses(tag.color)}`}>
        {tag.icon ? `${tag.icon} ` : ''}{tag.name}
      </span>
    )
  }

  const hasRemove = task.on_complete_remove_tag_ids.length > 0
  const hasAdd = task.on_complete_add_tag_ids.length > 0
  const hasTagRules = hasRemove || hasAdd

  // Each side-effect can be skipped at completion time. Tag flips default on
  // when configured; history defaults to the task's stored preference (and on
  // for legacy tasks that have no rules, so completing still records something).
  const [applyTags, setApplyTags] = useState(hasTagRules)
  const [logHistory, setLogHistory] = useState(task.on_complete_log_history || !hasTagRules)
  const [historyNote, setHistoryNote] = useState(task.title)
  const [saving, setSaving] = useState(false)

  const apply = async () => {
    setSaving(true)
    try {
      await window.electronAPI.tasks.completeWithRules(task.id, propertyId, {
        removeTagIds: applyTags ? task.on_complete_remove_tag_ids : [],
        addTagIds: applyTags ? task.on_complete_add_tag_ids : [],
        logHistory,
        historyNote: historyNote.trim() || task.title
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.byTarget(task.target_type, task.target_id) })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      queryClient.invalidateQueries({ queryKey: ['breakers'] })
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
          <p className="text-sm text-muted-foreground mt-1">
            {task.title} — {task.target_label}
            {task.target_amperage != null && (
              <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs font-medium align-middle">
                {task.target_amperage}A
              </span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 py-4 space-y-3">
          {hasTagRules && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={applyTags} onChange={e => setApplyTags(e.target.checked)} className="mt-0.5" />
              <span className="space-y-1">
                <span className="block">Apply tag changes to {task.target_label}</span>
                {hasRemove && (
                  <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    Remove: {task.on_complete_remove_tag_ids.map(tagChip)}
                  </span>
                )}
                {hasAdd && (
                  <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    Add: {task.on_complete_add_tag_ids.map(tagChip)}
                  </span>
                )}
              </span>
            </label>
          )}

          {!hasTagRules && (
            <p className="text-sm text-muted-foreground">
              No tag rules wired to this task — completing just marks it done.
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

        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border bg-background rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          <button onClick={apply} disabled={saving} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? 'Completing…' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
