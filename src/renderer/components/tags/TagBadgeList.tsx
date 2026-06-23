import { useState } from 'react'
import type { TargetType } from '@shared/types'
import { useTagsForTarget } from '../../hooks/useTags'
import { TagBadge } from './TagBadge'

interface TagBadgeListProps {
  targetType: TargetType
  targetId: string
  // Max full-text badges shown before the rest collapse into a "+N" chip.
  maxVisible?: number
}

// Renders a target's tags as a compact badge row. Tags flagged `condense`
// show as icon-only; once the visible count exceeds maxVisible, the surplus
// collapses into a "+N" chip that expands on click.
export function TagBadgeList({ targetType, targetId, maxVisible = 3 }: TagBadgeListProps) {
  const { data: tags } = useTagsForTarget(targetType, targetId)
  const [expanded, setExpanded] = useState(false)

  if (!tags || tags.length === 0) return null

  const visible = expanded ? tags : tags.slice(0, maxVisible)
  const hiddenCount = tags.length - visible.length

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {visible.map(tag => (
        <TagBadge key={tag.id} tag={tag} condensed={tag.condense} />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={e => {
            e.stopPropagation()
            setExpanded(true)
          }}
          className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70"
          title={`Show ${hiddenCount} more`}
        >
          +{hiddenCount} ▾
        </button>
      )}
    </div>
  )
}
