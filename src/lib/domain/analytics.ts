import type { SessionData, ScoreValue, ArrowData, Modality, TargetVariant, ClockSector, DominantHand, Hint, PREntry, PersonalRecords, ProgressionPoint } from './types'
import { getTargetDef } from './target'

const SCORE_VALUES: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

export function pointsPerEnd(session: SessionData): number[] {
  return session.ends.map(e => e.arrows.reduce((sum, a) => sum + a.points, 0))
}

export function scoreDistribution(session: SessionData): Record<ScoreValue, number> {
  const dist = Object.fromEntries(SCORE_VALUES.map(s => [s, 0])) as Record<ScoreValue, number>
  for (const end of session.ends)
    for (const arrow of end.arrows) dist[arrow.score]++
  return dist
}

export function dispersionEllipse(arrows: ArrowData[]): {
  sdX: number; sdY: number; ratio: number; orientation: 'vertical' | 'horizontal' | 'round'
} {
  if (arrows.length < 2) return { sdX: 0, sdY: 0, ratio: 1, orientation: 'round' }
  const mx = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const my = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const sdX = Math.sqrt(arrows.reduce((s, a) => s + (a.x - mx) ** 2, 0) / arrows.length)
  const sdY = Math.sqrt(arrows.reduce((s, a) => s + (a.y - my) ** 2, 0) / arrows.length)
  const ratio = sdY === 0 ? (sdX === 0 ? 1 : Infinity) : sdX / sdY
  const orientation: 'vertical' | 'horizontal' | 'round' =
    ratio < 0.8 ? 'vertical' : ratio > 1.25 ? 'horizontal' : 'round'
  return { sdX, sdY, ratio, orientation }
}

export function groupCentroid(arrows: ArrowData[]): {
  x: number; y: number; magnitude: number; direction: string
} {
  if (arrows.length === 0) return { x: 100, y: 100, magnitude: 0, direction: 'Centered' }
  const x = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const y = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const magnitude = Math.hypot(x - 100, y - 100)
  const t = 4
  const v = y < 100 - t ? 'High' : y > 100 + t ? 'Low' : ''
  const h = x < 100 - t ? 'Left' : x > 100 + t ? 'Right' : ''
  const direction = v && h ? `${v}-${h}` : v || h || 'Centered'
  return { x, y, magnitude, direction }
}

const CENTER_THRESHOLD = 13 // ≈15% of indoor 1-SPOT spotRadius (84)

export function clockDistribution(arrows: ArrowData[]): Record<ClockSector, number> {
  const sectors: ClockSector[] = ['12h', '1-2h', '3h', '4-5h', '6h', '7-8h', '9h', '10-11h', 'center']
  const dist = Object.fromEntries(sectors.map(s => [s, 0])) as Record<ClockSector, number>
  for (const a of arrows) {
    const dx = a.x - 100, dy = a.y - 100
    if (Math.hypot(dx, dy) < CENTER_THRESHOLD) { dist['center']++; continue }
    const deg = Math.atan2(dy, dx) * 180 / Math.PI
    // 12h=top(SVG -90°), 3h=right(0°), 6h=bottom(90°), 9h=left(±180°)
    let sector: ClockSector
    if      (deg >= -112.5 && deg < -67.5)  sector = '12h'
    else if (deg >= -67.5  && deg < -22.5)  sector = '1-2h'
    else if (deg >= -22.5  && deg <  22.5)  sector = '3h'
    else if (deg >=  22.5  && deg <  67.5)  sector = '4-5h'
    else if (deg >=  67.5  && deg < 112.5)  sector = '6h'
    else if (deg >= 112.5  && deg < 157.5)  sector = '7-8h'
    else if (deg >= 157.5  || deg < -157.5) sector = '9h'
    else                                     sector = '10-11h'
    dist[sector]++
  }
  return dist
}

export function flagOutliers(
  arrows: ArrowData[],
  threshold = 2.0
): (ArrowData & { isOutlier: boolean })[] {
  if (arrows.length === 0) return []
  const cx = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const cy = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const dists = arrows.map(a => Math.hypot(a.x - cx, a.y - cy))
  const mean = dists.reduce((s, d) => s + d, 0) / dists.length
  const stdDev = Math.sqrt(dists.reduce((s, d) => s + (d - mean) ** 2, 0) / dists.length)
  return arrows.map((a, i) => ({ ...a, isOutlier: dists[i] > mean + threshold * stdDev }))
}

export function suggestPatterns(
  dispersion: ReturnType<typeof dispersionEllipse>,
  centroid: ReturnType<typeof groupCentroid>,
  dominantHand: DominantHand | null
): Hint[] {
  if (dominantHand === null) return []
  const hints: Hint[] = []
  const isLeft = centroid.direction.includes('Left')
  const isRight = centroid.direction.includes('Right')
  const isHigh = centroid.direction.includes('High')
  const isLow = centroid.direction.includes('Low')
  const isBiased = centroid.magnitude > 4
  const isTight = dispersion.sdX < 10 && dispersion.sdY < 10

  if ((dominantHand === 'right' && isLeft) || (dominantHand === 'left' && isRight)) {
    hints.push({
      pattern: dominantHand === 'right' ? 'Group concentrated at 9h (left)' : 'Group concentrated at 3h (right)',
      cause: 'Release tension or grip pressure on bow hand',
      observe: 'Watch your bow hand at full draw — relax grip, check follow-through',
    })
  }
  if ((dominantHand === 'right' && isRight) || (dominantHand === 'left' && isLeft)) {
    hints.push({
      pattern: dominantHand === 'right' ? 'Group concentrated at 3h (right)' : 'Group concentrated at 9h (left)',
      cause: 'Possible plucking or string leaving crooked',
      observe: 'Watch your release hand — let the string leave cleanly',
    })
  }
  if (isHigh && dispersion.orientation === 'vertical') {
    hints.push({
      pattern: 'Group high with vertical spread',
      cause: 'Inconsistent draw length or anchor point',
      observe: 'Check your anchor position is consistent on every arrow',
    })
  }
  if (isLow) {
    hints.push({
      pattern: 'Group concentrated low',
      cause: 'Possible collapse — back tension lost before release',
      observe: 'Hold your back tension longer, through the clicker if applicable',
    })
  }
  if (dispersion.orientation === 'round' && !isBiased) {
    hints.push({
      pattern: 'Round group with no directional bias',
      cause: 'Consistency issue, not aim — form or routine variation',
      observe: 'Focus on a consistent pre-shot routine and follow-through',
    })
  }
  if (isBiased && isTight) {
    hints.push({
      pattern: 'Tight group offset from center',
      cause: 'Consistent aim point — likely a sight or aim adjustment needed',
      observe: 'Move your sight in the direction of the group offset',
    })
  }
  return hints
}

export function endConsistency(session: SessionData): number {
  const pts = pointsPerEnd(session)
  if (pts.length < 2) return 0
  const mean = pts.reduce((s, p) => s + p, 0) / pts.length
  return Math.sqrt(pts.reduce((s, p) => s + (p - mean) ** 2, 0) / pts.length)
}

export function progressionSeries(
  sessions: { modality: Modality; createdAt: string; total: number; meanSpread: number }[],
  metric: 'score' | 'groupRadius'
): ProgressionPoint[] {
  return [...sessions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(s => ({
      date: s.createdAt,
      value: metric === 'score' ? s.total : s.meanSpread,
      modality: s.modality,
    }))
}

export function personalRecords(
  sessions: { id: string; modality: Modality; createdAt: string; total: number; meanSpread: number; bestEnd: number; totalX: number }[]
): PersonalRecords {
  function bestOf(
    filtered: typeof sessions,
    pick: (s: (typeof sessions)[0]) => number,
    dir: 'max' | 'min'
  ): PREntry | null {
    if (filtered.length === 0) return null
    const s = filtered.reduce((best, cur) =>
      dir === 'max' ? (pick(cur) > pick(best) ? cur : best) : (pick(cur) < pick(best) ? cur : best)
    )
    return { value: pick(s), sessionId: s.id, date: s.createdAt, modality: s.modality }
  }
  const indoor = sessions.filter(s => s.modality === 'INDOOR')
  const flint = sessions.filter(s => s.modality === 'FLINT')
  return {
    bestScoreIndoor: bestOf(indoor, s => s.total, 'max'),
    bestScoreFlint: bestOf(flint, s => s.total, 'max'),
    bestEnd: bestOf(sessions, s => s.bestEnd, 'max'),
    tightestGroup: bestOf(sessions.filter(s => s.meanSpread > 0), s => s.meanSpread, 'min'),
    mostX: bestOf(sessions, s => s.totalX, 'max'),
  }
}

export function computeSessionGroupTightness(
  arrows: { x: number; y: number; spotIndex: number | null | undefined }[],
  modality: Modality
): number {
  if (arrows.length === 0) return 0

  const groups = new Map<string, { x: number; y: number }[]>()
  for (const a of arrows) {
    const key = a.spotIndex == null ? 'single' : `multi-${a.spotIndex}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ x: a.x, y: a.y })
  }

  const multiVariant: TargetVariant = modality === 'INDOOR' ? '5-SPOT' : '4-SPOT'
  const singleRadius = getTargetDef(modality, '1-SPOT').spots[0].spotRadius
  const multiRadius = getTargetDef(modality, multiVariant).spots[0].spotRadius

  let weightedSum = 0
  let totalCount = 0

  for (const [key, pts] of groups) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const meanSpread = pts.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pts.length
    const refRadius = key === 'single' ? singleRadius : multiRadius
    weightedSum += (meanSpread / refRadius) * pts.length
    totalCount += pts.length
  }

  return totalCount === 0 ? 0 : weightedSum / totalCount
}

export type GroupingTier = 'tight' | 'good' | 'moderate' | 'spread'

export function groupingQuality(ratio: number): GroupingTier {
  if (ratio < 0.12) return 'tight'
  if (ratio < 0.28) return 'good'
  if (ratio < 0.50) return 'moderate'
  return 'spread'
}
