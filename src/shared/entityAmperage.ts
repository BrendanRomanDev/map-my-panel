// Pure amperage derivation — an entity's amperage IS its breaker's amperage,
// computed on read, never stored (so it can't go stale when the breaker
// changes). Shared by the renderer surfaces and the main-process task joins so
// the value is identical everywhere. No renderer/electron deps.

// Minimal breaker shape needed to read amperage.
export interface AmperageBreaker {
  id: string
  amperage: number | null
}

// Derive an entity's amperage from the breaker(s) it's mapped to.
//   - unmapped (no breaker)            → null (genuinely unknown)
//   - single breaker                   → that breaker's amperage
//   - double-pole (two+ breakers)      → the shared amperage; both legs are the
//                                        same rating by definition. If they ever
//                                        disagree (bad data), return the max so
//                                        we don't understate the circuit.
// Container breakers carry null amperage (specs live on their children); those
// contribute nothing and are skipped.
export function deriveEntityAmperage(
  breakerIds: string[],
  breakersById: Map<string, AmperageBreaker>
): number | null {
  const amps = breakerIds
    .map(id => breakersById.get(id)?.amperage)
    .filter((a): a is number => typeof a === 'number')
  if (amps.length === 0) return null
  return Math.max(...amps)
}

// Convenience: build the lookup map from a breaker list.
export function breakerAmperageMap(breakers: AmperageBreaker[]): Map<string, AmperageBreaker> {
  return new Map(breakers.map(b => [b.id, b]))
}

// Format for display. Null → null (callers omit the chip rather than show "—").
export function formatAmperage(amperage: number | null): string | null {
  return amperage == null ? null : `${amperage}A`
}
