import type { Modality, TargetVariant, SpotDef, RingDef, TargetDef, ScoreValue, ScoreInference } from './types'

export const SVG_SIZE = 200
export const SVG_CENTER = SVG_SIZE / 2
export const ARROW_DOT_RADIUS = 3

// Ring definitions — outerRadius values are in the same unit as spotRadius
// Indoor 1-spot: base spotRadius = 84
const INDOOR_RINGS: RingDef[] = [
  { score: 'X', outerRadius: 8,  fill: '#FFFFFF' },
  { score: '5', outerRadius: 15, fill: '#FFFFFF' },
  { score: '4', outerRadius: 30, fill: '#2B3990' },
  { score: '3', outerRadius: 46, fill: '#2B3990' },
  { score: '2', outerRadius: 65, fill: '#2B3990' },
  { score: '1', outerRadius: 84, fill: '#2B3990' },
]

// Indoor 5-spot: pre-normalized to spotRadius=32; scoring zones X/5/4/3 (no 1/2 rings)
// White ring at r=21 divides the 4 and 3 zones within the blue area.
const INDOOR_5SPOT_RINGS: RingDef[] = [
  { score: 'X', outerRadius: 4,  fill: '#FFFFFF' },
  { score: '5', outerRadius: 11, fill: '#FFFFFF' },
  { score: '4', outerRadius: 21, fill: '#2B3990', strokeColor: 'white', strokeWidth: 0.6 },
  { score: '3', outerRadius: 32, fill: '#2B3990' },
]

// Flint: base spotRadius = 80
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
    if (variant === '5-SPOT') {
      return {
        variant, modality,
        spots: INDOOR_5_SPOTS,
        rings: INDOOR_5SPOT_RINGS,
        background: '#2B3990',   // blue face — outer area beyond 4-ring is the face background
        arrowRadius: 1.5,
      }
    }
    // 1-SPOT
    return {
      variant, modality,
      spots: INDOOR_1_SPOTS,
      rings: INDOOR_RINGS,
      background: '#FFFFFF',
      arrowRadius: ARROW_DOT_RADIUS,
    }
  } else {
    const baseRadius = 80
    if (variant === '4-SPOT') {
      const spots = FLINT_4_SPOTS
      return {
        variant, modality, spots,
        rings: scaleRings(FLINT_RINGS, baseRadius, spots[0].spotRadius),
        background: '#FFFFFF',
        arrowRadius: 1.5,
      }
    }
    // 1-SPOT
    return {
      variant, modality,
      spots: FLINT_1_SPOTS,
      rings: FLINT_RINGS,
      background: '#FFFFFF',
      arrowRadius: ARROW_DOT_RADIUS,
    }
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Line rule: arrow scores if its edge (center − arrowRadius from spot center) is within a ring.
function scoreForSpot(x: number, y: number, spot: SpotDef, rings: RingDef[], arrowRadius: number): ScoreValue {
  const d = dist(x, y, spot.cx, spot.cy)
  const edgeDistance = d - arrowRadius
  for (const ring of rings) {
    if (edgeDistance <= ring.outerRadius) return ring.score
  }
  return 'M'
}

export function inferScoreFromCoords(
  x: number,
  y: number,
  modality: Modality,
  variant: TargetVariant,
  arrowRadiusOverride?: number
): ScoreInference {
  const target = getTargetDef(modality, variant)
  const arrowRadius = arrowRadiusOverride ?? target.arrowRadius
  const { rings } = target
  const isSingleSpot = target.spots.length === 1

  if (isSingleSpot) {
    const spot = target.spots[0]
    const score = scoreForSpot(x, y, spot, rings, arrowRadius)
    return { score, spotIndex: null }
  }

  // Multi-spot: find the closest spot whose outer ring the arrow edge touches
  let bestSpot: SpotDef | null = null
  let bestDist = Infinity

  for (const spot of target.spots) {
    const d = dist(x, y, spot.cx, spot.cy)
    const outerRing = rings[rings.length - 1]
    if (d - arrowRadius <= outerRing.outerRadius && d < bestDist) {
      bestDist = d
      bestSpot = spot
    }
  }

  if (!bestSpot) return { score: 'M', spotIndex: null }

  const score = scoreForSpot(x, y, bestSpot, rings, arrowRadius)
  return { score, spotIndex: bestSpot.index }
}
