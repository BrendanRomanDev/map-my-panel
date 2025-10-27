import { useQuery } from '@tanstack/react-query'
import type { BreakerWithEntityCount } from '@shared/types'
import { queryKeys } from '../lib/queryKeys'

export function useBreakers(panelId: string) {
  return useQuery({
    queryKey: queryKeys.breakers.byPanel(panelId),
    queryFn: () => window.electronAPI.breakers.listByPanel(panelId)
  })
}
