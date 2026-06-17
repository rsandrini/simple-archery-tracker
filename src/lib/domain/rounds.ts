import type { Modality, RoundConfig, TargetVariant, EndDistance } from './types'

export const INDOOR_CONFIG: RoundConfig = {
  id: 'INDOOR',
  name: 'Indoor Round',
  totalEnds: 12,
  arrowsPerEnd: 5,
  validScores: ['X', '5', '4', '3', '2', '1', 'M'],
  endDistances: Array.from({ length: 12 }, (_, i): EndDistance => ({
    endIndex: i,
    distance: '20yd',
    targetVariant: '1-SPOT', // overridden at runtime by session.targetVariant
    isWalkUp: false,
  })),
}

const FLINT_HALF: EndDistance[] = [
  { endIndex: 0, distance: '25yd',    targetVariant: '1-SPOT', isWalkUp: false },
  { endIndex: 1, distance: '20ft',    targetVariant: '4-SPOT', isWalkUp: false },
  { endIndex: 2, distance: '30yd',    targetVariant: '1-SPOT', isWalkUp: false },
  { endIndex: 3, distance: '15yd',    targetVariant: '4-SPOT', isWalkUp: false },
  { endIndex: 4, distance: '20yd',    targetVariant: '1-SPOT', isWalkUp: false },
  { endIndex: 5, distance: '10yd',    targetVariant: '4-SPOT', isWalkUp: false },
  { endIndex: 6, distance: 'Walk-up', targetVariant: '1-SPOT', isWalkUp: true,
    arrowDistances: ['30yd', '25yd', '20yd', '15yd'] },
]

export const FLINT_CONFIG: RoundConfig = {
  id: 'FLINT',
  name: 'Flint Round',
  totalEnds: 14,
  arrowsPerEnd: 4,
  validScores: ['X', '5', '4', '3', 'M'],
  // Two identical passes through the same 7-end sequence
  endDistances: [
    ...FLINT_HALF,
    ...FLINT_HALF.map(e => ({ ...e, endIndex: e.endIndex + 7 })),
  ],
}

const CONFIGS: Record<Modality, RoundConfig> = {
  INDOOR: INDOOR_CONFIG,
  FLINT: FLINT_CONFIG,
}

export function getConfig(modality: string): RoundConfig {
  const config = CONFIGS[modality as Modality]
  if (!config) throw new Error(`Unknown modality: ${modality}`)
  return config
}

// Returns the distance label for a specific arrow in an end.
// For walk-up ends, returns the per-arrow distance; otherwise the end-level distance.
export function getArrowDistance(config: RoundConfig, endIndex: number, arrowIndex: number): string {
  const endDist = config.endDistances[endIndex]
  if (!endDist) return ''
  if (endDist.isWalkUp && endDist.arrowDistances) {
    return endDist.arrowDistances[arrowIndex] ?? endDist.distance
  }
  return endDist.distance
}

// Returns the target variant for an end.
// For INDOOR: uses the session-level targetVariant (user's choice).
// For FLINT: uses the end's configured variant (auto-selected by distance).
export function getEndTargetVariant(
  config: RoundConfig,
  endIndex: number,
  sessionTargetVariant: TargetVariant
): TargetVariant {
  if (config.id === 'INDOOR') return sessionTargetVariant
  return config.endDistances[endIndex]?.targetVariant ?? '1-SPOT'
}
