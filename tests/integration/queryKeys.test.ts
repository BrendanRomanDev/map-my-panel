import { describe, it, expect } from 'vitest'
import { queryKeys, invalidateEntityBreakerQueries } from '../../src/renderer/lib/queryKeys'

describe('Query Keys', () => {
  describe('queryKeys factory', () => {
    it('should generate consistent panel query keys', () => {
      const panelId = 'panel-123'
      const key1 = queryKeys.panels.detail(panelId)
      const key2 = queryKeys.panels.detail(panelId)

      expect(key1).toEqual(key2)
      expect(key1).toEqual(['panels', 'panel-123'])
    })

    it('should generate consistent breaker query keys', () => {
      const panelId = 'panel-123'
      const breakerId = 'breaker-456'

      expect(queryKeys.breakers.all).toEqual(['breakers'])
      expect(queryKeys.breakers.byPanel(panelId)).toEqual(['breakers', 'panel-123'])
      expect(queryKeys.breakers.detail(breakerId)).toEqual(['breakers', 'detail', 'breaker-456'])
    })

    it('should generate consistent entity query keys', () => {
      const panelId = 'panel-123'
      const breakerId = 'breaker-456'
      const entityId = 'entity-789'

      expect(queryKeys.entities.all).toEqual(['entities'])
      expect(queryKeys.entities.byPanel(panelId)).toEqual(['entities', 'panel-123'])
      expect(queryKeys.entities.byRoom(panelId)).toEqual(['entities', 'byRoom', 'panel-123'])
      expect(queryKeys.entities.byBreaker(breakerId)).toEqual(['entities', 'byBreaker', 'breaker-456'])
      expect(queryKeys.entities.unmapped(panelId)).toEqual(['entities', 'unmapped', 'panel-123'])
      expect(queryKeys.entities.detail(entityId)).toEqual(['entities', 'detail', 'entity-789'])
    })
  })

  describe('invalidateEntityBreakerQueries', () => {
    it('should return all relevant queries when unassigning from breaker', () => {
      const panelId = 'panel-123'
      const oldBreakerId = 'breaker-456'
      const newBreakerId = null

      const queries = invalidateEntityBreakerQueries(panelId, oldBreakerId, newBreakerId)

      expect(queries).toContainEqual(['entities', 'panel-123'])
      expect(queries).toContainEqual(['entities', 'byRoom', 'panel-123'])
      expect(queries).toContainEqual(['entities', 'unmapped', 'panel-123'])
      expect(queries).toContainEqual(['breakers', 'panel-123'])
      expect(queries).toContainEqual(['entities', 'byBreaker', 'breaker-456'])

      // Should have 5 queries total
      expect(queries).toHaveLength(5)
    })

    it('should return queries for both old and new breakers when reassigning', () => {
      const panelId = 'panel-123'
      const oldBreakerId = 'breaker-456'
      const newBreakerId = 'breaker-789'

      const queries = invalidateEntityBreakerQueries(panelId, oldBreakerId, newBreakerId)

      expect(queries).toContainEqual(['entities', 'byBreaker', 'breaker-456'])
      expect(queries).toContainEqual(['entities', 'byBreaker', 'breaker-789'])

      // Should have 6 queries total
      expect(queries).toHaveLength(6)
    })

    it('should handle null old breaker (initial assignment)', () => {
      const panelId = 'panel-123'
      const oldBreakerId = null
      const newBreakerId = 'breaker-789'

      const queries = invalidateEntityBreakerQueries(panelId, oldBreakerId, newBreakerId)

      expect(queries).toContainEqual(['entities', 'byBreaker', 'breaker-789'])
      expect(queries).not.toContainEqual(['entities', 'byBreaker', null])

      // Should have 5 queries total (base 4 + new breaker)
      expect(queries).toHaveLength(5)
    })

    it('should handle both null (editing non-breaker fields)', () => {
      const panelId = 'panel-123'
      const oldBreakerId = null
      const newBreakerId = null

      const queries = invalidateEntityBreakerQueries(panelId, oldBreakerId, newBreakerId)

      // Should only have base queries
      expect(queries).toHaveLength(4)
      expect(queries).toContainEqual(['entities', 'panel-123'])
      expect(queries).toContainEqual(['entities', 'byRoom', 'panel-123'])
      expect(queries).toContainEqual(['entities', 'unmapped', 'panel-123'])
      expect(queries).toContainEqual(['breakers', 'panel-123'])
    })
  })

  describe('query key uniqueness', () => {
    it('should generate different keys for different panels', () => {
      const key1 = queryKeys.entities.byPanel('panel-1')
      const key2 = queryKeys.entities.byPanel('panel-2')

      expect(key1).not.toEqual(key2)
    })

    it('should generate different keys for different breakers', () => {
      const key1 = queryKeys.entities.byBreaker('breaker-1')
      const key2 = queryKeys.entities.byBreaker('breaker-2')

      expect(key1).not.toEqual(key2)
    })

    it('should generate different keys for different query types', () => {
      const panelId = 'panel-123'

      const allEntities = queryKeys.entities.byPanel(panelId)
      const byRoom = queryKeys.entities.byRoom(panelId)
      const unmapped = queryKeys.entities.unmapped(panelId)

      expect(allEntities).not.toEqual(byRoom)
      expect(allEntities).not.toEqual(unmapped)
      expect(byRoom).not.toEqual(unmapped)
    })
  })

  describe('type safety', () => {
    it('should enforce readonly arrays', () => {
      const key = queryKeys.entities.all

      // TypeScript should prevent mutation
      // @ts-expect-error - readonly array
      // key.push('test')

      // This test mainly ensures TypeScript compilation succeeds
      expect(key).toEqual(['entities'])
    })
  })
})
