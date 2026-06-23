import { useState } from 'react'
import type { TargetType, TargetRef } from '@shared/types'
import { useBreakers } from '../../hooks/useBreakers'
import { useEntities } from '../../hooks/useEntities'

interface TargetPickerProps {
  panelId: string
  propertyId: string
  selected: TargetRef[]
  onChange: (targets: TargetRef[]) => void
}

interface Option {
  target_type: TargetType
  target_id: string
  label: string
  group: string
}

function keyOf(t: { target_type: string; target_id: string }): string {
  return `${t.target_type}:${t.target_id}`
}

// Searchable, grouped, multi-select picker over the property's entities,
// breakers, and the property itself. Mixed target types allowed.
export function TargetPicker({ panelId, propertyId, selected, onChange }: TargetPickerProps) {
  const { data: breakers } = useBreakers(panelId)
  const { data: entities } = useEntities(panelId)
  const [query, setQuery] = useState('')

  const options: Option[] = []
  for (const e of entities || []) {
    options.push({
      target_type: 'entity',
      target_id: e.id,
      label: e.room ? `${e.name} (${e.room})` : e.name,
      group: 'Entities'
    })
  }
  for (const b of breakers || []) {
    if (b.is_container) continue
    const pos = `${b.position}${b.position_slot || ''}`
    options.push({
      target_type: 'breaker',
      target_id: b.id,
      label: b.label ? `Breaker ${pos} — ${b.label}` : `Breaker ${pos}`,
      group: 'Breakers'
    })
  }
  options.push({
    target_type: 'property',
    target_id: propertyId,
    label: 'Whole property',
    group: 'Property'
  })

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options

  const selectedKeys = new Set(selected.map(keyOf))

  const toggle = (opt: Option) => {
    const k = keyOf(opt)
    if (selectedKeys.has(k)) {
      onChange(selected.filter(s => keyOf(s) !== k))
    } else {
      onChange([...selected, { target_type: opt.target_type, target_id: opt.target_id }])
    }
  }

  // Preserve group order: Entities, Breakers, Property
  const groupOrder = ['Entities', 'Breakers', 'Property']
  const grouped = groupOrder
    .map(g => ({ group: g, items: filtered.filter(o => o.group === g) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search targets..."
        className="w-full text-sm px-2 py-1 rounded border border-border bg-background"
      />
      <div className="max-h-48 overflow-auto border border-border rounded divide-y divide-border">
        {grouped.length === 0 && (
          <div className="text-xs text-muted-foreground p-2">No matches</div>
        )}
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted/40">
              {group}
            </div>
            {items.map(opt => {
              const checked = selectedKeys.has(keyOf(opt))
              return (
                <label
                  key={keyOf(opt)}
                  className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                  <span className="truncate">{opt.label}</span>
                </label>
              )
            })}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{selected.length} selected</div>
    </div>
  )
}
