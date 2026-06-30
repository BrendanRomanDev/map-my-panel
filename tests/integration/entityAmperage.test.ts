import { describe, it, expect } from 'vitest'
import { deriveEntityAmperage, breakerAmperageMap, formatAmperage } from '../../src/shared/entityAmperage'

const map = (breakers: { id: string; amperage: number | null }[]) => breakerAmperageMap(breakers)

describe('deriveEntityAmperage', () => {
  it('returns null when the entity has no breaker (unmapped)', () => {
    expect(deriveEntityAmperage([], map([{ id: 'b1', amperage: 20 }]))).toBeNull()
  })

  it('returns the single breaker amperage', () => {
    expect(deriveEntityAmperage(['b1'], map([{ id: 'b1', amperage: 20 }]))).toBe(20)
  })

  it('returns the shared amperage for a double-pole pair', () => {
    expect(deriveEntityAmperage(['b1', 'b2'], map([
      { id: 'b1', amperage: 30 }, { id: 'b2', amperage: 30 }
    ]))).toBe(30)
  })

  it('returns the max if legs disagree (bad data — do not understate)', () => {
    expect(deriveEntityAmperage(['b1', 'b2'], map([
      { id: 'b1', amperage: 20 }, { id: 'b2', amperage: 30 }
    ]))).toBe(30)
  })

  it('skips container breakers (null amperage) and resolves the real one', () => {
    expect(deriveEntityAmperage(['container', 'b1'], map([
      { id: 'container', amperage: null }, { id: 'b1', amperage: 15 }
    ]))).toBe(15)
  })

  it('returns null when the breaker id is unknown / missing', () => {
    expect(deriveEntityAmperage(['gone'], map([{ id: 'b1', amperage: 20 }]))).toBeNull()
  })
})

describe('formatAmperage', () => {
  it('formats a number as "<n>A"', () => {
    expect(formatAmperage(20)).toBe('20A')
  })
  it('returns null for null (callers omit the chip)', () => {
    expect(formatAmperage(null)).toBeNull()
  })
})
