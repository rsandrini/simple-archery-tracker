import type { Modality, TargetVariant, SpotDef, RingDef, TargetDef, ScoreValue, ScoreInference } from './types'

export const SVG_SIZE = 200
export const SVG_CENTER = SVG_SIZE / 2
export const ARROW_DOT_RADIUS = 3

// Normalized ring definitions: outerRadius at full spotRadius scale
// Indoor: full spotRadius = 84; Flint: full spotRadius = 80
const INDOOR_RINGS: RingDef[] = [
  { score: 'X', outerRadius: 8,  fill: '#FFFFFF' },
  { score: '5', outerRadius: 15, fill: '#FFFFFF' },
  { score: '4', outerRadius: 30, fill: '#2B3990' },
  { score: '3', outerRadius: 46, fill: '#2B3990' },
  { score: '2', outerRadius: 65, fill: '#2B3990' },
  { score: '1', outerRadius: 84, fill: '#2B3990' },
]

const FLINT_RINGS: RingDef[] = [
  { score: 'X', outerRadius: 8,  fill: '#1A1A1A' },
  { score: '5', outerRadius: 18, fill: '#FFFFFF' },
  { score: '4', outerRadius: 45, fill: '#FFFFFF' },
  { score: '3', outerRadius: 80, fill: '#1A1A1A' },
]

const INDOOR_1_SPOTS: SpotDef[] = [
  { index: 0, cx: SVG_CENTER, cy: SVG_CENTER, spotRadius: 84 },
]

const INDOOR_5_SPOTS: SpotDef[] = [
  { index: 0, cx: 42,  cy: 42,  spotRadius: 32 },
  { index: 1, cx: 158, cy: 42,  spotRadius: 32 },
  { index: 2, cx: 100, cy: 100, spotRadius: 32 },
  { index: 3, cx: 42,  cy: 158, spotRadius: 32 },
  { index: 4, cx: 158, cy: 158, spotRadius: 32 },
]

const FLINT_1_SPOTS: SpotDef[] = [
  { index: 0, cx: SVG_CENTER, cy: SVG_CENTER, spotRadius: 80 },
]

const FLINT_4_SPOTS: SpotDef[] = [
  { index: 0, cx: 50,  cy: 50,  spotRadius: 40 },
  { index: 1, cx: 150, cy: 50,  spotRadius: 40 },
  { index: 2, cx: 50,  cy: 150, spotRadius: 40 },
  { index: 3, cx: 150, cy: 150, spotRadius: 40 },
]

function scaleRings(rings: RingDef[], baseRadius: number, targetRadius: number): RingDef[] {
  if (baseRadius === targetRadius) return rings
  const ratio = targetRadius / baseRadius
  return rings.map(r => ({ ...r, outerRadius: r.outerRadius * ratio }))
}

export function getTargetDef(modality: Modality, variant: TargetVariant): TargetDef {
  if (modality === 'INDOOR') {
    const baseRadius = 84
    const spots = variant === '5-SPOT' ? INDOOR_5_SPOTS : INDOOR_1_SPOTS
    const spotRadius = spots[0].spotRadius
    return {
      variant,
      modality,
      spots,
      rings: scaleRings(INDOOR_RINGS, baseRadius, spotRadius),
      background: '#FFFFFF',
    }
  } else {
    const baseRadius = 80
    const spots = variant === '4-SPOT' ? FLINT_4_SPOTS : FLINT_1_SPOTS
    const spotRadius = spots[0].spotRadius
    return {
      variant,
      modality,
      spots,
      rings: scaleRings(FLINT_RINGS, baseRadius, spotRadius),
      background: '#FFFFFF',
    }
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Line rule: if the edge of the arrow dot (center - ARROW_DOT_RADIUS from spot center)
// falls within a ring's outerRadius, that ring's score is awarded.
function scoreForSpot(x: number, y: number, spot: SpotDef, rings: RingDef[]): ScoreValue {
  const d = dist(x, y, spot.cx, spot.cy)
  const edgeDistance = d - ARROW_DOT_RADIUS
  for (const ring of rings) {
    if (edgeDistance <= ring.outerRadius) return ring.score
  }
  return 'M'
}

export function inferScoreFromCoords(
  x: number,
  y: number,
  modality: Modality,
  variant: TargetVariant
): ScoreInference {
  const target = getTargetDef(modality, variant)
  const isSingleSpot = target.spots.length === 1

  if (isSingleSpot) {
    const spot = target.spots[0]
    const score = scoreForSpot(x, y, spot, target.rings)
    return { score, spotIndex: null }
  }

  // Multi-spot: find the spot whose center is closest AND where the dot edge is within its outer ring
  let bestSpot: SpotDef | null = null
  let bestDist = Infinity

  for (const spot of target.spots) {
    const d = dist(x, y, spot.cx, spot.cy)
    const outerRing = target.rings[target.rings.length - 1]
    const edgeDistance = d - ARROW_DOT_RADIUS
    if (edgeDistance <= outerRing.outerRadius && d < bestDist) {
      bestDist = d
      bestSpot = spot
    }
  }

  if (!bestSpot) return { score: 'M', spotIndex: null }

  const score = scoreForSpot(x, y, bestSpot, target.rings)
  return { score, spotIndex: bestSpot.index }
}
