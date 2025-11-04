import type { BreakerWithEntityCount } from '@shared/types'

interface BreakerCardProps {
  breaker: BreakerWithEntityCount
  allBreakers?: BreakerWithEntityCount[]
  rooms?: string[]
  isHighlighted?: boolean
  onClick?: () => void
  onPowerToggle?: (breakerId: string, isPowered: boolean) => void
  onHover?: (breakerId: string | null) => void
}

export function BreakerCard({ breaker, allBreakers, rooms, isHighlighted = false, onClick, onPowerToggle, onHover }: BreakerCardProps) {
  const isSpare = breaker.status === 'spare'
  const hasEntities = breaker.entity_count > 0
  const isPoweredOff = !breaker.is_powered

  // Find linked breaker if this breaker is linked
  const linkedBreaker = breaker.linked_breaker_id && allBreakers
    ? allBreakers.find(b => b.id === breaker.linked_breaker_id)
    : null

  // Check if this is a tandem base position (no slot, but other breakers with same position have slots)
  const isTandemBase = !breaker.position_slot && allBreakers
    ? allBreakers.some(b => b.position === breaker.position && b.position_slot)
    : false

  const handlePowerToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPowerToggle && !isSpare && !isTandemBase) {
      onPowerToggle(breaker.id, !breaker.is_powered)
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover?.(breaker.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`w-full p-3 border-2 rounded transition-all text-left ${
        isHighlighted
          ? 'border-primary bg-primary/30 ring-4 ring-primary/50 shadow-xl scale-[1.02]'
          : isSpare || isTandemBase || isPoweredOff
          ? 'border-muted/50 bg-muted/10 hover:bg-muted/20 opacity-60'
          : hasEntities
          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
          : 'border-yellow-500/40 bg-yellow-50/30 hover:bg-yellow-100/30 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30'
      } ${breaker.position_slot ? 'border-l-4 border-l-accent' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Position and label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {breaker.position}
              {breaker.position_slot && (
                <span className="text-xs">{breaker.position_slot}</span>
              )}
            </span>
            {breaker.label && (
              <span className="text-sm truncate">{breaker.label}</span>
            )}
            {isPoweredOff && !isSpare && !isTandemBase && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                OFF
              </span>
            )}
            {linkedBreaker && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 inline-flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {linkedBreaker.position}{linkedBreaker.position_slot || ''}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {breaker.amperage}A •{' '}
            {breaker.breaker_type === 'single-pole' ? 'SP' : 'DP'}
            {hasEntities && ` • ${breaker.entity_count} ${breaker.entity_count === 1 ? 'entity' : 'entities'}`}
          </div>
          {rooms && rooms.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
              {rooms.slice(0, 3).map((room) => (
                <span
                  key={room}
                  className="px-1.5 py-0.5 rounded bg-muted text-foreground/80"
                >
                  {room}
                </span>
              ))}
              {rooms.length > 3 && (
                <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/60 font-medium">
                  +{rooms.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Power toggle and status indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Power toggle switch (only for actual breakers, not spare or tandem base positions) */}
          {!isSpare && !isTandemBase && (
            <button
              onClick={handlePowerToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                breaker.is_powered ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              title={breaker.is_powered ? 'Turn OFF' : 'Turn ON'}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  breaker.is_powered ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}

          {/* Status indicator */}
          {isSpare || isTandemBase || isPoweredOff ? (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          ) : hasEntities ? (
            <div className="w-2 h-2 rounded-full bg-primary" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
          )}
        </div>
      </div>
    </button>
  )
}
