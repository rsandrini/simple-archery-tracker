import type { ScoreValue, ArrowData, EndData, SessionData, SessionSummary, EndSummary } from './types'

const SCORE_ORDER: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

export function scoreToPoints(score: ScoreValue): number {
  if (score === 'X') return 5
  if (score === 'M') return 0
  return parseInt(score, 10)
}

export function isX(score: ScoreValue): boolean {
  return score === 'X'
}

export function endTotal(arrows: ArrowData[]): number {
  return arrows.reduce((sum, a) => sum + a.points, 0)
}

export function sortArrowsDescending(arrows: ArrowData[]): ArrowData[] {
  return [...arrows].sort(
    (a, b) => SCORE_ORDER.indexOf(a.score) - SCORE_ORDER.indexOf(b.score)
  )
}

export function runningTotals(ends: EndData[]): number[] {
  let running = 0
  return ends.map(e => {
    running += endTotal(e.arrows)
    return running
  })
}

export function sessionSummary(session: SessionData): SessionSummary {
  const totals = runningTotals(session.ends)
  const perEnd: EndSummary[] = session.ends.map((e, i) => ({
    endIndex: e.index,
    arrows: sortArrowsDescending(e.arrows),
    endTotal: endTotal(e.arrows),
    runningTotal: totals[i] ?? 0,
  }))

  return {
    total: totals[totals.length - 1] ?? 0,
    totalX: session.ends.flatMap(e => e.arrows).filter(a => a.isX).length,
    perEnd,
  }
}

// Checks for double-hit on multi-spot targets. If newArrow lands on the same spot
// as an existing arrow, the higher-score arrow becomes M. Returns the updated full
// arrow list (existing arrows that changed + the new arrow appended).
export function resolveDoubleHit(existingArrows: ArrowData[], newArrow: ArrowData): ArrowData[] {
  if (newArrow.spotIndex == null) {
    return [...existingArrows, newArrow]
  }

  const collision = existingArrows.find(a => a.spotIndex === newArrow.spotIndex)
  if (!collision) {
    return [...existingArrows, newArrow]
  }

  const collisionRank = SCORE_ORDER.indexOf(collision.score)
  const newRank = SCORE_ORDER.indexOf(newArrow.score)

  // Rule: lower VALUE (higher rank index) stays valid; higher VALUE (lower rank index) becomes M.
  // X=0 is highest value → lowest rank index. M=6 is lowest value → highest rank index.
  if (collisionRank < newRank) {
    // existing has HIGHER value → existing becomes M, new arrow (lower value) stays
    const updated = existingArrows.map(a =>
      a.id === collision.id ? { ...a, score: 'M' as ScoreValue, points: 0, isX: false } : a
    )
    return [...updated, newArrow]
  } else {
    // new arrow has HIGHER or EQUAL value → new arrow becomes M, existing (lower value) stays
    return [
      ...existingArrows,
      { ...newArrow, score: 'M' as ScoreValue, points: 0, isX: false },
    ]
  }
}
