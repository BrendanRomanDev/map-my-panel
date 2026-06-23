import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

function todayYmd(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Logs a "link change" marker history event (combine or split) onto both
// breakers, dated today. Resolves/creates the event type by name. Used by the
// opt-in checkboxes on the link/split flows. Invalidates breaker rollups.
export async function logBreakerLinkChange(
  queryClient: QueryClient,
  opts: {
    propertyId: string
    breakerAId: string
    breakerBId: string
    kind: 'combined' | 'split'
  }
): Promise<void> {
  const typeName = opts.kind === 'combined' ? 'Combined into double-pole' : 'Split double-pole'
  const notes =
    opts.kind === 'combined'
      ? 'Linked as a double-pole.'
      : 'Split from double-pole into independent breakers.'

  // Resolve event type by name (reuse if it exists, else create)
  const existing = await window.electronAPI.history.listEventTypes(opts.propertyId)
  const match = existing.find(t => t.name.toLowerCase() === typeName.toLowerCase())
  const eventTypeId = match
    ? match.id
    : (await window.electronAPI.history.createEventType({ property_id: opts.propertyId, name: typeName })).id

  await window.electronAPI.history.createEvent({
    property_id: opts.propertyId,
    event_type_id: eventTypeId,
    notes,
    occurred_on: todayYmd(),
    targets: [
      { target_type: 'breaker', target_id: opts.breakerAId },
      { target_type: 'breaker', target_id: opts.breakerBId }
    ]
  })

  queryClient.invalidateQueries({ queryKey: queryKeys.history.eventTypes(opts.propertyId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.history.byProperty(opts.propertyId) })
  queryClient.invalidateQueries({ queryKey: ['history', 'breakerRollup'] })
}

// Cross-links every existing event on each breaker onto the other, so the two
// timelines show the union of their prior histories. Used by the "merge prior
// history" checkbox on link. No-ops on events already shared.
export async function mergeBreakerHistories(
  queryClient: QueryClient,
  breakerAId: string,
  breakerBId: string
): Promise<void> {
  const [aEvents, bEvents] = await Promise.all([
    window.electronAPI.history.listForBreakerRollup(breakerAId),
    window.electronAPI.history.listForBreakerRollup(breakerBId)
  ])

  const isOn = (ev: { targets: { target_type: string; target_id: string }[] }, breakerId: string) =>
    ev.targets.some(t => t.target_type === 'breaker' && t.target_id === breakerId)

  // Events on A not yet on B → add B; events on B not yet on A → add A.
  // Only consider events directly on the breaker (not entity-bubbled ones).
  const addB = aEvents.filter(ev => isOn(ev, breakerAId) && !isOn(ev, breakerBId))
  const addA = bEvents.filter(ev => isOn(ev, breakerBId) && !isOn(ev, breakerAId))

  await Promise.all([
    ...addB.map(ev =>
      window.electronAPI.history.addTargets(ev.id, [{ target_type: 'breaker', target_id: breakerBId }])
    ),
    ...addA.map(ev =>
      window.electronAPI.history.addTargets(ev.id, [{ target_type: 'breaker', target_id: breakerAId }])
    )
  ])

  queryClient.invalidateQueries({ queryKey: queryKeys.history.all })
}
