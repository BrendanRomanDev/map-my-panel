import { describe, it, expect } from 'vitest'
import { planLinkChange, isLinkError } from '../../src/renderer/lib/breakerLinking'
import type { LinkableBreaker } from '../../src/renderer/lib/breakerLinking'

function bk(over: Partial<LinkableBreaker> & { id: string; position: number }): LinkableBreaker {
  return {
    position_slot: null,
    breaker_type: 'single-pole',
    linked_breaker_id: null,
    ...over
  }
}

describe('planLinkChange', () => {
  it('links two free single-poles → both become double-pole, linked', () => {
    const a = bk({ id: 'a', position: 19, position_slot: 'a' })
    const b = bk({ id: 'b', position: 21, position_slot: 'a' })
    const plan = planLinkChange(a, 'b', false, [a, b])
    expect(isLinkError(plan)).toBe(false)
    if (isLinkError(plan)) return
    expect(plan.updates).toContainEqual({ id: 'a', breaker_type: 'double-pole', linked_breaker_id: 'b' })
    expect(plan.updates).toContainEqual({ id: 'b', breaker_type: 'double-pole', linked_breaker_id: 'a' })
    expect(plan.newPartnerId).toBe('b')
    expect(plan.abandonedPartnerId).toBeNull()
  })

  it('blocks linking to a breaker already paired with someone else', () => {
    const a = bk({ id: 'a', position: 19 })
    const b = bk({ id: 'b', position: 21, breaker_type: 'double-pole', linked_breaker_id: 'c' })
    const c = bk({ id: 'c', position: 23, breaker_type: 'double-pole', linked_breaker_id: 'b' })
    const plan = planLinkChange(a, 'b', false, [a, b, c])
    expect(isLinkError(plan)).toBe(true)
    if (!isLinkError(plan)) return
    expect(plan.error).toMatch(/already a double-pole/)
    expect(plan.error).toMatch(/23/)
  })

  it('re-link: 19a from 17a to 21a abandons 17a (→single) and pairs 19a+21a', () => {
    const self = bk({ id: '19a', position: 19, position_slot: 'a', breaker_type: 'double-pole', linked_breaker_id: '17a' })
    const old = bk({ id: '17a', position: 17, position_slot: 'a', breaker_type: 'double-pole', linked_breaker_id: '19a' })
    const next = bk({ id: '21a', position: 21, position_slot: 'a' })
    const plan = planLinkChange(self, '21a', false, [self, old, next])
    expect(isLinkError(plan)).toBe(false)
    if (isLinkError(plan)) return
    expect(plan.updates).toContainEqual({ id: '17a', breaker_type: 'single-pole', linked_breaker_id: null })
    expect(plan.updates).toContainEqual({ id: '19a', breaker_type: 'double-pole', linked_breaker_id: '21a' })
    expect(plan.updates).toContainEqual({ id: '21a', breaker_type: 'double-pole', linked_breaker_id: '19a' })
    expect(plan.abandonedPartnerId).toBe('17a')
    expect(plan.newPartnerId).toBe('21a')
    expect(plan.warnings.join(' ')).toMatch(/17a will become single-pole/)
  })

  it('unlink (target null) abandons partner; self stays double-pole unless makeSelfSingle', () => {
    const self = bk({ id: '19a', position: 19, position_slot: 'a', breaker_type: 'double-pole', linked_breaker_id: '17a' })
    const old = bk({ id: '17a', position: 17, position_slot: 'a', breaker_type: 'double-pole', linked_breaker_id: '19a' })

    const keep = planLinkChange(self, null, false, [self, old])
    if (isLinkError(keep)) throw new Error('unexpected')
    expect(keep.updates).toContainEqual({ id: '17a', breaker_type: 'single-pole', linked_breaker_id: null })
    expect(keep.updates).toContainEqual({ id: '19a', breaker_type: 'double-pole', linked_breaker_id: null })

    const drop = planLinkChange(self, null, true, [self, old])
    if (isLinkError(drop)) throw new Error('unexpected')
    expect(drop.updates).toContainEqual({ id: '19a', breaker_type: 'single-pole', linked_breaker_id: null })
  })

  it('no-op when target equals current partner', () => {
    const self = bk({ id: '19a', position: 19, breaker_type: 'double-pole', linked_breaker_id: '17a' })
    const old = bk({ id: '17a', position: 17, breaker_type: 'double-pole', linked_breaker_id: '19a' })
    const plan = planLinkChange(self, '17a', false, [self, old])
    if (isLinkError(plan)) throw new Error('unexpected')
    expect(plan.updates).toHaveLength(0)
  })
})
