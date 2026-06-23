import type { Breaker } from '@shared/types'

// A minimal shape sufficient for link planning (works with Breaker or
// BreakerWithEntityCount).
export interface LinkableBreaker {
  id: string
  position: number
  position_slot: 'a' | 'b' | null
  breaker_type: 'single-pole' | 'double-pole' | null
  linked_breaker_id: string | null
}

export interface BreakerTypeUpdate {
  id: string
  breaker_type: 'single-pole' | 'double-pole'
  linked_breaker_id: string | null
}

export interface LinkPlan {
  // Human-readable consequences to show in the confirm dialog
  warnings: string[]
  // DB updates to apply on Save (each breaker patched once)
  updates: BreakerTypeUpdate[]
  // The old partner being abandoned (for split-history handling), if any
  abandonedPartnerId: string | null
  // The newly-formed partner (for merge-history handling), if any
  newPartnerId: string | null
}

export interface LinkError {
  error: string
}

function label(b: LinkableBreaker): string {
  return `${b.position}${b.position_slot || ''}`
}

// Pure planner: given the breaker being edited, its desired new link target
// (id or null), whether the user wants the edited breaker to also drop to
// single-pole on unlink, and the full breaker list, returns either a LinkPlan
// (set of updates + warnings) or a LinkError (blocked).
//
// Rules:
// - A breaker can be in at most one double-pole pair. Targeting a breaker
//   that's already linked to someone else is an error.
// - The old partner (if any) is always abandoned → reverts to single-pole.
// - Linking to a free breaker converts BOTH to double-pole, linked to each other.
// - Unlinking (target null): the edited breaker stays double-pole-unlinked
//   unless makeSelfSingle is true; the old partner always reverts.
export function planLinkChange(
  self: LinkableBreaker,
  desiredTargetId: string | null,
  makeSelfSingle: boolean,
  allBreakers: LinkableBreaker[]
): LinkPlan | LinkError {
  const byId = (id: string) => allBreakers.find(b => b.id === id) || null
  const oldPartnerId = self.linked_breaker_id
  const oldPartner = oldPartnerId ? byId(oldPartnerId) : null

  // No-op
  if (desiredTargetId === oldPartnerId) {
    return { warnings: [], updates: [], abandonedPartnerId: null, newPartnerId: null }
  }

  const updates: BreakerTypeUpdate[] = []
  const warnings: string[] = []

  // Validate the new target isn't already paired with someone else
  let target: LinkableBreaker | null = null
  if (desiredTargetId) {
    target = byId(desiredTargetId)
    if (!target) return { error: 'Selected breaker not found.' }
    if (target.linked_breaker_id && target.linked_breaker_id !== self.id) {
      const other = byId(target.linked_breaker_id)
      return {
        error: `Breaker ${label(target)} is already a double-pole linked to ${
          other ? label(other) : 'another breaker'
        }. Unlink ${label(target)} first.`
      }
    }
  }

  // Abandon the old partner → single-pole, unlinked
  if (oldPartner) {
    updates.push({ id: oldPartner.id, breaker_type: 'single-pole', linked_breaker_id: null })
    warnings.push(`Breaker ${label(oldPartner)} will become single-pole (no longer linked).`)
  }

  if (target) {
    // Link self ↔ target, both double-pole
    updates.push({ id: self.id, breaker_type: 'double-pole', linked_breaker_id: target.id })
    updates.push({ id: target.id, breaker_type: 'double-pole', linked_breaker_id: self.id })
    if (target.breaker_type !== 'double-pole') {
      warnings.push(`Breaker ${label(target)} will become double-pole (linked to ${label(self)}).`)
    }
    return {
      warnings,
      updates,
      abandonedPartnerId: oldPartner ? oldPartner.id : null,
      newPartnerId: target.id
    }
  }

  // Unlinking (no target). Self optionally drops to single-pole.
  if (makeSelfSingle) {
    updates.push({ id: self.id, breaker_type: 'single-pole', linked_breaker_id: null })
  } else {
    updates.push({ id: self.id, breaker_type: self.breaker_type === 'double-pole' ? 'double-pole' : 'single-pole', linked_breaker_id: null })
  }

  return {
    warnings,
    updates,
    abandonedPartnerId: oldPartner ? oldPartner.id : null,
    newPartnerId: null
  }
}

export function isLinkError(result: LinkPlan | LinkError): result is LinkError {
  return 'error' in result
}
