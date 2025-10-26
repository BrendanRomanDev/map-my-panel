import { useQuery } from '@tanstack/react-query'
import type { BreakerWithEntityCount } from '@shared/types'

export function useBreakers(panelId: string) {
  return useQuery({
    queryKey: ['breakers', panelId],
    queryFn: () => window.electronAPI.breakers.listByPanel(panelId)
  })
}
