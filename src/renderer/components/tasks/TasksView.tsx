import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TaskWithEntity, Entity } from '@shared/types'
import { DEFAULT_TASK_TYPES } from '@shared/types'
import { useTasksForPanel } from '../../hooks/useTasks'
import { useEntities } from '../../hooks/useEntities'
import { queryKeys } from '../../lib/queryKeys'
import { CompleteTaskModal } from './CompleteTaskModal'
import { generateTaskCandidates, type TaskCandidate } from './generateTasks'

interface TasksViewProps {
  propertyId: string
  panelId: string
}

export function TasksView({ propertyId, panelId }: TasksViewProps) {
  const queryClient = useQueryClient()
  const { data: tasks } = useTasksForPanel(panelId)
  const { data: entities } = useEntities(panelId)

  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open')
  const [completing, setCompleting] = useState<TaskWithEntity | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byPanel(panelId) })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const shown = (tasks || []).filter(t => (filter === 'all' ? true : t.status === filter))

  const reopen = async (id: string) => { await window.electronAPI.tasks.reopen(id); invalidate() }
  const del = async (id: string) => { await window.electronAPI.tasks.delete(id); invalidate() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted"
          >
            ✨ Suggested Tasks
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {(['open', 'done', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {f === 'open' ? 'Open' : f === 'done' ? 'Done' : 'All'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === 'open' ? 'No open tasks. 🎉' : 'No tasks.'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map(t => (
            <div key={t.id} className="flex items-start gap-3 p-3 border border-border rounded">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={() => (t.status === 'done' ? reopen(t.id) : setCompleting(t))}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {t.task_type && (
                    <span className="inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1.5 align-middle no-underline">
                      {t.task_type}
                    </span>
                  )}
                  {t.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.entity_name}{t.entity_room ? ` · ${t.entity_room}` : ''}
                </div>
                {t.notes && <div className="text-xs text-muted-foreground mt-1">{t.notes}</div>}
              </div>
              <button onClick={() => del(t.id)} className="text-xs text-destructive hover:underline flex-shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddTaskModal
          entities={entities || []}
          onClose={() => setShowAdd(false)}
          onSaved={() => { invalidate(); setShowAdd(false) }}
        />
      )}

      {showGenerate && (
        <GenerateTasksModal
          entities={entities || []}
          existingTasks={tasks || []}
          onClose={() => setShowGenerate(false)}
          onCreated={() => { invalidate(); setShowGenerate(false) }}
        />
      )}

      {completing && (
        <CompleteTaskModal
          task={completing}
          propertyId={propertyId}
          panelId={panelId}
          onClose={() => setCompleting(null)}
          onDone={() => { invalidate(); setCompleting(null) }}
        />
      )}
    </div>
  )
}

// ---- Add Task ----
function AddTaskModal({ entities, onClose, onSaved }: { entities: Entity[]; onClose: () => void; onSaved: () => void }) {
  const [entityId, setEntityId] = useState('')
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!entityId || !title.trim()) return
    setSaving(true)
    try {
      await window.electronAPI.tasks.create({ entity_id: entityId, title: title.trim(), task_type: taskType || null, notes: notes.trim() || null })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 p-6 pb-3 border-b border-border">
          <h3 className="text-lg font-bold">Add Task</h3>
        </div>
        <div className="flex-1 overflow-auto p-6 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Entity</label>
            <select value={entityId} onChange={e => setEntityId(e.target.value)} className="w-full text-sm px-2 py-2 rounded border border-border bg-background">
              <option value="">— Select —</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}{e.room ? ` (${e.room})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm px-2 py-2 rounded border border-border bg-background" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type (optional)</label>
            <select value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full text-sm px-2 py-2 rounded border border-border bg-background">
              <option value="">— None —</option>
              {DEFAULT_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full text-sm px-2 py-2 rounded border border-border bg-background" />
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving || !entityId || !title.trim()} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
  )
}

// ---- Suggested Tasks (objective facts only — no tag inspection) ----
function GenerateTasksModal({ entities, existingTasks, onClose, onCreated }: {
  entities: Entity[]; existingTasks: TaskWithEntity[]; onClose: () => void; onCreated: () => void
}) {
  const candidates = generateTaskCandidates(entities, existingTasks)
  const [picked, setPicked] = useState<Set<number>>(() => new Set(candidates.map((_, i) => i)))
  const [saving, setSaving] = useState(false)

  const toggle = (i: number) => {
    const next = new Set(picked); next.has(i) ? next.delete(i) : next.add(i); setPicked(next)
  }
  const allSelected = candidates.length > 0 && picked.size === candidates.length
  const toggleAll = () => setPicked(allSelected ? new Set() : new Set(candidates.map((_, i) => i)))

  const create = async () => {
    setSaving(true)
    try {
      for (let i = 0; i < candidates.length; i++) {
        if (!picked.has(i)) continue
        const c = candidates[i]
        await window.electronAPI.tasks.create({ entity_id: c.entityId, title: c.title, task_type: c.taskType, notes: c.notes })
      }
      onCreated()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-3 border-b border-border">
          <h3 className="text-lg font-bold">Suggested Tasks</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {candidates.length} suggestion{candidates.length === 1 ? '' : 's'} from your panel — skips entities that already have a matching open task.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto p-6 py-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to suggest — every entity has a breaker and a room (or already has a mapping task). 🎉</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-muted-foreground">{picked.size} of {candidates.length} selected</span>
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {candidates.map((c, i) => (
                <label key={i} className="flex items-start gap-2 p-2 border border-border rounded text-sm cursor-pointer">
                  <input type="checkbox" checked={picked.has(i)} onChange={() => toggle(i)} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1 align-middle">
                      {c.taskType}
                    </span>
                    <span className="font-medium">{c.title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{c.entityName}{c.notes ? ` — ${c.notes}` : ''}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border bg-background rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          {candidates.length > 0 && (
            <button onClick={create} disabled={saving || picked.size === 0} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
              Create {picked.size} task{picked.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
