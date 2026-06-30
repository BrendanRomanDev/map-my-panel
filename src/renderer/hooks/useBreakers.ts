import { useQuery } from '@tanstack/react-query'
import type { BreakerWithEntityCount, Entity } from '@shared/types'
import { queryKeys } from '../lib/queryKeys'
import { deriveEntityAmperage, breakerAmperageMap } from '@shared/entityAmperage'

export function useBreakers(panelId: string) {
  return useQuery({
    queryKey: queryKeys.breakers.byPanel(panelId),
    queryFn: () => window.electronAPI.breakers.listByPanel(panelId)
  })
}

// An entity's amperage is DERIVED from its breaker(s), never stored — so it's
// always accurate when the breaker changes. Reads the panel's breakers from the
// shared React Query cache (deduped with the grid's existing query), so a card
// can resolve its own amperage without prop-threading. Null when unmapped.
export function useEntityAmperage(entity: Entity): number | null {
  const { data: breakers } = useBreakers(entity.panel_id)
  if (!breakers) return null
  return deriveEntityAmperage(entity.breaker_ids, breakerAmperageMap(breakers))
}
