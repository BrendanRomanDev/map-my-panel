import type { BreakerWithEntityCount } from '@shared/types'

interface BreakerCardProps {
  breaker: BreakerWithEntityCount
  allBreakers?: BreakerWithEntityCount[]
  onClick?: () => void
  onPowerToggle?: (breakerId: string, isPowered: boolean) => void
}

export function BreakerCard({ breaker, allBreakers, onClick, onPowerToggle }: BreakerCardProps) {
  const isSpare = breaker.status === 'spare'
  const hasEntities = breaker.entity_count > 0
  const isPoweredOff = !breaker.is_powered

  // Find linked breaker if this breaker is linked
  const linkedBreaker = breaker.linked_breaker_id && allBreakers
    ? allBreakers.find(b => b.id === breaker.linked_breaker_id)
    : null

  const handlePowerToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPowerToggle && !isSpare) {
      onPowerToggle(breaker.id, !breaker.is_powered)
    }
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 border rounded transition-colors text-left ${
        isSpare
          ? 'border-muted bg-muted/30 hover:bg-muted/50'
          : isPoweredOff
          ? 'border-orange-500/50 bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-950/30 dark:hover:bg-orange-950/50'
          : hasEntities
          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-background hover:bg-muted/30'
      }`}
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
            {isPoweredOff && !isSpare && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-300">
                OFF
              </span>
            )}
            {linkedBreaker && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground inline-flex items-center gap-1">
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
            {hasEntities && ` • ${breaker.entity_count} entity(ies)`}
          </div>
        </div>

        {/* Power toggle and status indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Power toggle switch (only for active breakers) */}
          {!isSpare && (
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
          {isSpare ? (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          ) : isPoweredOff ? (
            <div className="w-2 h-2 rounded-full bg-orange-500" />
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
