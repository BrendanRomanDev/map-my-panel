import type { Tag } from '@shared/types'
import { tagColorClasses } from './tagColors'

interface TagBadgeProps {
  tag: Tag
  // When true and the tag has an icon, render icon-only (condensed form)
  condensed?: boolean
  onRemove?: () => void
}

export function TagBadge({ tag, condensed, onRemove }: TagBadgeProps) {
  // Tooltip: name, plus description on a second line when present
  const tooltip = tag.description ? `${tag.name} — ${tag.description}` : tag.name
  const showIconOnly = !!condensed && !!tag.icon

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tagColorClasses(tag.color)}`}
    >
      {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
      {!showIconOnly && <span className="truncate max-w-[10rem]">{tag.name}</span>}
      {onRemove && (
        <button
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 text-muted-foreground hover:text-foreground"
          title={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
