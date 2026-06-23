// Named color palette for tags. Stored as a key on the tag (`color`) and
// mapped to theme-aware Tailwind classes here, so the badge component stays
// clean and the color picker offers a finite, semantic set.

export const TAG_COLORS = {
  gray: 'gray',
  red: 'red',
  amber: 'amber',
  green: 'green',
  blue: 'blue',
  purple: 'purple'
} as const

export type TagColor = (typeof TAG_COLORS)[keyof typeof TAG_COLORS]

// Badge background + text classes per color, light and dark.
const COLOR_CLASSES: Record<TagColor, string> = {
  gray: 'bg-secondary text-secondary-foreground',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
}

// Falls back to the neutral secondary style for null/unknown colors.
export function tagColorClasses(color: string | null): string {
  if (color && color in COLOR_CLASSES) {
    return COLOR_CLASSES[color as TagColor]
  }
  return COLOR_CLASSES.gray
}

export const TAG_COLOR_OPTIONS: TagColor[] = Object.values(TAG_COLORS)
