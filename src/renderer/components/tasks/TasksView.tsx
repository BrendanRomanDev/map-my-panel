import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TaskWithTarget, Entity, Breaker, Panel, TaskRules, TaskTemplate, TargetType } from '@shared/types'
import { DEFAULT_TASK_TYPES, TARGET_TYPES } from '@shared/types'
import { useTasksForProperty, useTaskTemplates } from '../../hooks/useTasks'
import { useEntities } from '../../hooks/useEntities'
import { useBreakers } from '../../hooks/useBreakers'
import { queryKeys } from '../../lib/queryKeys'
import { CompleteTaskModal } from './CompleteTaskModal'
import { TaskRulesEditor } from './TaskRulesEditor'
import { generateTaskCandidates } from './generateTasks'

// Small inline icons (the app uses Feather/Lucide-style SVGs, no icon lib).
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
function UndoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  )
}

interface TasksViewProps {
  propertyId: string
  panelId: string
}

// A selectable target choice (resolved label) used by the pickers.
interface TargetChoice {
  target_type: TargetType
  target_id: string
  label: string
  sublabel?: string | null
}

const TARGET_FILTERS = [
  { key: 'all', label: 'All' },
  { key: TARGET_TYPES.ENTITY, label: 'Entities' },
  { key: TARGET_TYPES.BREAKER, label: 'Breakers' },
  { key: TARGET_TYPES.PANEL, label: 'Panels' },
  { key: TARGET_TYPES.PROPERTY, label: 'Property' }
] as const

function breakerLabel(b: Breaker): string {
  return b.label || `Breaker ${b.position}${b.position_slot || ''}`
}

// Plural label for a target type (entity → entities, the rest just take 's').
function pluralTargetType(type: TargetType): string {
  return type === TARGET_TYPES.ENTITY ? 'entities' : `${type}s`
}

export function TasksView({ propertyId, panelId }: TasksViewProps) {
  const queryClient = useQueryClient()
  const { data: tasks } = useTasksForProperty(propertyId)
  const { data: entities } = useEntities(panelId)

  const [statusFilter, setStatusFilter] = useState<'open' | 'done' | 'all'>('open')
  const [targetFilter, setTargetFilter] = useState<TargetType | 'all'>('all')
  const [completing, setCompleting] = useState<TaskWithTarget | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [applyTemplate, setApplyTemplate] = useState<TaskTemplate | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const shown = (tasks || [])
    .filter(t => (statusFilter === 'all' ? true : t.status === statusFilter))
    .filter(t => (targetFilter === 'all' ? true : t.target_type === targetFilter))

  const reopen = async (id: string) => { await window.electronAPI.tasks.reopen(id); invalidate() }
  const del = async (id: string) => { await window.electronAPI.tasks.delete(id); invalidate() }

  // Bulk selection for delete. Acts on the currently-shown (filtered) tasks.
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const shownIds = shown.map(t => t.id)
  const allShownSelected = shownIds.length > 0 && shownIds.every(id => selectedIds.has(id))
  const toggleSelectAllShown = () => {
    setSelectedIds(prev => {
      if (allShownSelected) {
        const next = new Set(prev)
        shownIds.forEach(id => next.delete(id))
        return next
      }
      return new Set([...prev, ...shownIds])
    })
  }
  const deleteSelected = async () => {
    await Promise.all([...selectedIds].map(id => window.electronAPI.tasks.delete(id)))
    setSelectedIds(new Set())
    invalidate()
  }
  // Bulk complete applies each task's OWN stored rules silently (opening a
  // confirm modal per task would be miserable). Only open tasks are completed.
  const selectedOpen = (tasks || []).filter(t => selectedIds.has(t.id) && t.status === 'open')
  const completeSelected = async () => {
    await Promise.all(selectedOpen.map(t => window.electronAPI.tasks.completeWithRules(t.id, propertyId)))
    setSelectedIds(new Set())
    queryClient.invalidateQueries({ queryKey: ['tags'] })
    queryClient.invalidateQueries({ queryKey: ['history'] })
    invalidate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className={`text-sm px-3 py-1.5 rounded border ${selectMode ? 'border-primary text-primary' : 'border-border hover:bg-muted'}`}
          >
            {selectMode ? 'Done' : 'Select multiple'}
          </button>
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

      {/* Status filter */}
      <div className="flex gap-1 mb-2">
        {(['open', 'done', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1 rounded ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {f === 'open' ? 'Open' : f === 'done' ? 'Done' : 'All'}
          </button>
        ))}
      </div>

      {/* Target-type filter */}
      <div className="flex gap-1 mb-4">
        {TARGET_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTargetFilter(f.key as TargetType | 'all')}
            className={`text-xs px-3 py-1 rounded border ${targetFilter === f.key ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TemplateStrip propertyId={propertyId} onApply={setApplyTemplate} />

      {/* Bulk-action bar: only in select mode. Select tasks, then complete or delete. */}
      {selectMode && shown.length > 0 && (
        <div className="flex items-center gap-3 mb-2 text-xs">
          <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={allShownSelected} onChange={toggleSelectAllShown} />
            Select all shown
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="text-muted-foreground">{selectedIds.size} selected</span>
              {selectedOpen.length > 0 && (
                <button onClick={completeSelected} className="px-2 py-1 rounded bg-green-600 text-white hover:opacity-90">
                  Complete {selectedOpen.length}
                </button>
              )}
              <button onClick={deleteSelected} className="px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-90">
                Delete {selectedIds.size}
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-muted-foreground hover:underline">
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {statusFilter === 'open' ? 'No open tasks. 🎉' : 'No tasks.'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map(t => (
            <div key={t.id} className={`flex items-start gap-3 p-3 border rounded ${selectMode && selectedIds.has(t.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
              {/* Select mode: a single selection checkbox drives bulk actions. */}
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelect(t.id)}
                  className="mt-1"
                  title="Select"
                />
              )}
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
                  <span className="capitalize">{t.target_type}</span>: {t.target_label}{t.target_room ? ` · ${t.target_room}` : ''}
                  {t.target_amperage != null && (
                    <span className="ml-1.5 inline-block px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-[10px] font-medium">
                      {t.target_amperage}A
                    </span>
                  )}
                </div>
                {t.notes && <div className="text-xs text-muted-foreground mt-1">{t.notes}</div>}
              </div>
              {/* Per-row icon actions — hidden in select mode (bulk bar drives it). */}
              {!selectMode && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {t.status === 'done' ? (
                    <button onClick={() => reopen(t.id)} title="Reopen" className="p-1.5 rounded text-muted-foreground hover:bg-muted">
                      <UndoIcon />
                    </button>
                  ) : (
                    <button onClick={() => setCompleting(t)} title="Complete" className="p-1.5 rounded text-green-600 hover:bg-green-600/10">
                      <CheckIcon />
                    </button>
                  )}
                  <button onClick={() => del(t.id)} title="Delete" className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddTaskModal
          propertyId={propertyId}
          panelId={panelId}
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
          onClose={() => setCompleting(null)}
          onDone={() => { invalidate(); setCompleting(null) }}
        />
      )}

      {applyTemplate && (
        <ApplyTemplateModal
          template={applyTemplate}
          propertyId={propertyId}
          panelId={panelId}
          onClose={() => setApplyTemplate(null)}
          onApplied={() => { invalidate(); setApplyTemplate(null) }}
        />
      )}
    </div>
  )
}

// ---- Templates strip + apply ----
function TemplateStrip({ propertyId, onApply }: { propertyId: string; onApply: (t: TaskTemplate) => void }) {
  const queryClient = useQueryClient()
  const { data: templates } = useTaskTemplates(propertyId)
  if (!templates || templates.length === 0) return null

  const remove = async (id: string) => {
    await window.electronAPI.tasks.deleteTemplate(id)
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.templates(propertyId) })
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Templates</p>
      <div className="flex flex-wrap gap-1.5">
        {templates.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1 text-xs rounded border border-border bg-muted pl-2">
            <button onClick={() => onApply(t)} className="py-1 hover:text-primary" title={`Apply "${t.title_template}" to targets`}>
              {t.task_type ? `${t.task_type}: ` : ''}{t.name}
            </button>
            <button onClick={() => remove(t.id)} className="px-1.5 py-1 text-muted-foreground hover:text-destructive" title="Delete template">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ApplyTemplateModal({ template, propertyId, panelId, onClose, onApplied }: {
  template: TaskTemplate; propertyId: string; panelId: string; onClose: () => void; onApplied: () => void
}) {
  const queryClient = useQueryClient()
  const [targets, setTargets] = useState<TargetChoice[]>([])
  const [saving, setSaving] = useState(false)

  const apply = async () => {
    if (targets.length === 0) return
    setSaving(true)
    try {
      await window.electronAPI.tasks.createFromTemplate(
        template.id,
        targets.map(t => ({ target_type: t.target_type, target_id: t.target_id }))
      )
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      onApplied()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 p-6 pb-3 border-b border-border">
          <h3 className="text-lg font-bold">Apply template: {template.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Creates "{template.title_template}" on each selected target.
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6 py-4">
          <TargetPicker propertyId={propertyId} panelId={panelId} selected={targets} onChange={setTargets} />
        </div>
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border bg-background rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          <button onClick={apply} disabled={saving || targets.length === 0} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? 'Applying…' : `Apply to ${targets.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Target picker ----
// Pick a target TYPE (defaults to Entity), then one or more targets of that
// type. Entity/Breaker/Panel offer a searchable multi-select; Property is the
// single property itself. Selecting a different type replaces the selection so
// a task's targets are always homogeneous.
function TargetPicker({ propertyId, panelId, selected, onChange, showSelectAll = true }: {
  propertyId: string; panelId: string; selected: TargetChoice[]; onChange: (next: TargetChoice[]) => void; showSelectAll?: boolean
}) {
  const [type, setType] = useState<TargetType>(TARGET_TYPES.ENTITY)
  const [query, setQuery] = useState('')
  const { data: entities } = useEntities(panelId)
  const { data: breakers } = useBreakers(panelId)
  const [panels, setPanels] = useState<Panel[] | null>(null)

  // Lazily load panels only when the Panel type is chosen.
  const ensurePanels = async () => {
    if (panels) return
    setPanels(await window.electronAPI.panels.findByProperty(propertyId))
  }

  const choices: TargetChoice[] = (() => {
    if (type === TARGET_TYPES.ENTITY) {
      return (entities || []).map(e => ({ target_type: TARGET_TYPES.ENTITY, target_id: e.id, label: e.name, sublabel: e.room }))
    }
    if (type === TARGET_TYPES.BREAKER) {
      return (breakers || []).map(b => ({ target_type: TARGET_TYPES.BREAKER, target_id: b.id, label: breakerLabel(b), sublabel: b.label ? null : null }))
    }
    if (type === TARGET_TYPES.PANEL) {
      return (panels || []).map(p => ({ target_type: TARGET_TYPES.PANEL, target_id: p.id, label: p.name }))
    }
    // property
    return [{ target_type: TARGET_TYPES.PROPERTY, target_id: propertyId, label: 'This property' }]
  })()

  const q = query.trim().toLowerCase()
  const filtered = q
    ? choices.filter(c => c.label.toLowerCase().includes(q) || (c.sublabel || '').toLowerCase().includes(q))
    : choices

  const isSelected = (c: TargetChoice) => selected.some(s => s.target_id === c.target_id && s.target_type === c.target_type)
  const toggle = (c: TargetChoice) =>
    onChange(isSelected(c) ? selected.filter(s => !(s.target_id === c.target_id && s.target_type === c.target_type)) : [...selected, c])

  const filteredSelectable = filtered
  const allFilteredSelected = filteredSelectable.length > 0 && filteredSelectable.every(isSelected)
  const toggleAll = () => {
    if (allFilteredSelected) {
      const drop = new Set(filteredSelectable.map(c => c.target_id))
      onChange(selected.filter(s => !drop.has(s.target_id)))
    } else {
      const merged = [...selected]
      for (const c of filteredSelectable) if (!isSelected(c)) merged.push(c)
      onChange(merged)
    }
  }

  const changeType = async (next: TargetType) => {
    setType(next)
    setQuery('')
    onChange([]) // keep targets homogeneous
    if (next === TARGET_TYPES.PANEL) await ensurePanels()
    if (next === TARGET_TYPES.PROPERTY) {
      onChange([{ target_type: TARGET_TYPES.PROPERTY, target_id: propertyId, label: 'This property' }])
    }
  }

  const showSearch = type !== TARGET_TYPES.PROPERTY

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1">Task is for</label>
        <div className="flex gap-1">
          {([TARGET_TYPES.ENTITY, TARGET_TYPES.BREAKER, TARGET_TYPES.PANEL, TARGET_TYPES.PROPERTY] as TargetType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={`text-xs px-2.5 py-1 rounded border capitalize ${type === t ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {type === TARGET_TYPES.PROPERTY ? (
        <p className="text-sm text-muted-foreground">
          A property-level task. It shows in Tasks regardless of which panel you're viewing.
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium capitalize">
              {pluralTargetType(type)} {selected.length > 0 && <span className="text-muted-foreground font-normal">({selected.length} selected)</span>}
            </span>
            {showSelectAll && (
              <button type="button" onClick={toggleAll} disabled={filtered.length === 0} className="text-xs text-primary hover:underline disabled:opacity-40">
                {allFilteredSelected ? 'Deselect all' : q ? 'Select all matches' : 'Select all'}
              </button>
            )}
          </div>
          {showSearch && (
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${pluralTargetType(type)}…`}
              className="w-full mb-1 text-sm px-2 py-1.5 rounded border border-border bg-background"
            />
          )}
          <div className="max-h-40 overflow-auto border border-border rounded divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">{q ? `No ${pluralTargetType(type)} match "${query}".` : `No ${pluralTargetType(type)} on this panel.`}</p>
            ) : (
              filtered.map(c => (
                <label key={`${c.target_type}:${c.target_id}`} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                  <input type="checkbox" checked={isSelected(c)} onChange={() => toggle(c)} />
                  <span>{c.label}{c.sublabel ? <span className="text-muted-foreground"> ({c.sublabel})</span> : ''}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Add Task ----
// Covers all of Story 4.3's authoring + polymorphic targets: target-type +
// target picker (defaults to Entity), tag-wiring rules, inline tag creation,
// bulk apply to many targets (one task each), and save-as-template. Title
// supports {entityName} (the target's resolved name) for bulk/template titles.
const EMPTY_RULES: TaskRules = {
  on_create_tag_id: null,
  on_complete_remove_tag_ids: [],
  on_complete_add_tag_ids: [],
  on_complete_log_history: false
}

function AddTaskModal({ propertyId, panelId, onClose, onSaved }: {
  propertyId: string; panelId: string; onClose: () => void; onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [targets, setTargets] = useState<TargetChoice[]>([])
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState('')
  const [notes, setNotes] = useState('')
  const [rules, setRules] = useState<TaskRules>(EMPTY_RULES)
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving] = useState(false)

  const isBulk = targets.length > 1
  const canSave = targets.length > 0 && !!title.trim() && (!saveTemplate || !!templateName.trim())

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (saveTemplate) {
        await window.electronAPI.tasks.createTemplate({
          property_id: propertyId,
          name: templateName.trim(),
          task_type: taskType || null,
          title_template: title.trim(),
          notes: notes.trim() || null,
          ...rules
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.templates(propertyId) })
      }

      // One task per selected target ({entityName} → the target's label).
      for (const target of targets) {
        const resolvedTitle = title.trim().replace(/\{entityName\}/g, target.label)
        await window.electronAPI.tasks.create({
          target_type: target.target_type,
          target_id: target.target_id,
          title: resolvedTitle,
          task_type: taskType || null,
          notes: notes.trim() || null,
          ...rules
        })
      }
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 p-6 pb-3 border-b border-border">
          <h3 className="text-lg font-bold">Add Task</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pick what the task is for — one target, or many to create a task on each.
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6 py-4 space-y-3">
          <TargetPicker propertyId={propertyId} panelId={panelId} selected={targets} onChange={setTargets} showSelectAll={false} />
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm px-2 py-2 rounded border border-border bg-background" autoFocus />
            {isBulk && (
              <p className="text-xs text-muted-foreground mt-1">
                Tip: use <code className="px-1 rounded bg-muted">{'{entityName}'}</code> to insert each target's name.
              </p>
            )}
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

          <TaskRulesEditor propertyId={propertyId} value={rules} onChange={setRules} />

          <div className="border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} />
              Save these settings as a reusable template
            </label>
            {saveTemplate && (
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Self-ground outlet)"
                className="w-full mt-2 text-sm px-2 py-2 rounded border border-border bg-background"
              />
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-border bg-background rounded-b-lg">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving || !canSave} className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? 'Saving…' : isBulk ? `Add ${targets.length} tasks` : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Suggested Tasks (objective facts only — no tag inspection) ----
function GenerateTasksModal({ entities, existingTasks, onClose, onCreated }: {
  entities: Entity[]; existingTasks: TaskWithTarget[]; onClose: () => void; onCreated: () => void
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
        await window.electronAPI.tasks.create({ target_type: 'entity', target_id: c.entityId, title: c.title, task_type: c.taskType, notes: c.notes })
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
