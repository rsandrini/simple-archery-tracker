import { describe, it, expect } from 'vitest'
import {
  pointsPerEnd, scoreDistribution,
  dispersionEllipse, groupCentroid, clockDistribution,
  flagOutliers, suggestPatterns, endConsistency,
  progressionSeries, personalRecords,
} from '@/lib/domain/analytics'
import type { SessionData, ScoreValue, ArrowData } from '@/lib/domain/types'

const POINTS: Record<ScoreValue, number> = {
  X: 5, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, M: 0,
}

function makeSession(endArrows: ScoreValue[][]): SessionData {
  return {
    id: 'test',
    modality: 'INDOOR',
    targetVariant: '1-SPOT',
    createdAt: '2026-01-01T00:00:00Z',
    ends: endArrows.map((scores, endIdx) => ({
      id: `end-${endIdx}`,
      index: endIdx,
      arrows: scores.map((score, arrowIdx) => ({
        id: `arrow-${endIdx}-${arrowIdx}`,
        index: arrowIdx,
        score,
        points: POINTS[score],
        isX: score === 'X',
        x: 100,
        y: 100,
      })),
    })),
  }
}

function makeArrows(coords: { x: number; y: number }[]): ArrowData[] {
  return coords.map((c, i) => ({
    id: `a${i}`,
    index: i,
    score: '5' as ScoreValue,
    points: 5,
    isX: false,
    x: c.x,
    y: c.y,
  }))
}

// ── existing tests ─────────────────────────────────────────────────────────────

describe('pointsPerEnd', () => {
  it('returns one total per end', () => {
    const session = makeSession([
      ['X', '5', '4'],  // 5+5+4 = 14
      ['3', '2', '1'],  // 3+2+1 = 6
      ['5', '5', 'M'],  // 5+5+0 = 10
    ])
    expect(pointsPerEnd(session)).toEqual([14, 6, 10])
  })

  it('returns empty array for session with no ends', () => {
    expect(pointsPerEnd(makeSession([]))).toEqual([])
  })

  it('returns 0 for an end with no arrows', () => {
    expect(pointsPerEnd(makeSession([[]]))).toEqual([0])
  })
})

describe('scoreDistribution', () => {
  it('counts each score value across all ends', () => {
    const session = makeSession([['X', 'X', '5'], ['4', '3', 'M']])
    expect(scoreDistribution(session)).toEqual({
      X: 2, '5': 1, '4': 1, '3': 1, '2': 0, '1': 0, M: 1,
    })
  })

  it('returns all zeros for empty session', () => {
    expect(scoreDistribution(makeSession([]))).toEqual({
      X: 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, M: 0,
    })
  })
})

// ── new tests ──────────────────────────────────────────────────────────────────

describe('dispersionEllipse', () => {
  it('returns round defaults for fewer than 2 arrows', () => {
    expect(dispersionEllipse([])).toEqual({ sdX: 0, sdY: 0, ratio: 1, orientation: 'round' })
    expect(dispersionEllipse(makeArrows([{ x: 100, y: 100 }]))).toEqual({ sdX: 0, sdY: 0, ratio: 1, orientation: 'round' })
  })

  it('detects vertical dispersion (sdY > sdX)', () => {
    // 2 arrows aligned vertically
    const result = dispersionEllipse(makeArrows([{ x: 100, y: 80 }, { x: 100, y: 120 }]))
    expect(result.sdX).toBeCloseTo(0)
    expect(result.sdY).toBeGreaterThan(0)
    expect(result.orientation).toBe('vertical')
  })

  it('detects horizontal dispersion (sdX > sdY)', () => {
    // 2 arrows aligned horizontally
    const result = dispersionEllipse(makeArrows([{ x: 80, y: 100 }, { x: 120, y: 100 }]))
    expect(result.sdY).toBeCloseTo(0)
    expect(result.sdX).toBeGreaterThan(0)
    expect(result.orientation).toBe('horizontal')
  })

  it('detects round dispersion (balanced spread)', () => {
    // square pattern — equal spread in X and Y
    const arrows = makeArrows([
      { x: 90, y: 100 }, { x: 110, y: 100 },
      { x: 100, y: 90 }, { x: 100, y: 110 },
    ])
    const result = dispersionEllipse(arrows)
    expect(result.orientation).toBe('round')
    expect(result.ratio).toBeCloseTo(1, 2)
  })
})

describe('groupCentroid', () => {
  it('returns Centered for empty arrows', () => {
    const r = groupCentroid([])
    expect(r.direction).toBe('Centered')
    expect(r.magnitude).toBe(0)
  })

  it('returns Centered when group is at target center', () => {
    const r = groupCentroid(makeArrows([{ x: 100, y: 100 }, { x: 100, y: 100 }]))
    expect(r.direction).toBe('Centered')
    expect(r.magnitude).toBeCloseTo(0)
  })

  it('returns Left when group is to the left beyond threshold', () => {
    // x=94, centroid x=94, dx=-6 < -4
    const r = groupCentroid(makeArrows([{ x: 94, y: 100 }]))
    expect(r.direction).toBe('Left')
  })

  it('returns High-Left for top-left group', () => {
    // x=90, y=90 → dx=-10, dy=-10
    const r = groupCentroid(makeArrows([{ x: 90, y: 90 }]))
    expect(r.direction).toBe('High-Left')
  })

  it('does not flag direction at exact threshold boundary', () => {
    // dx = -4 (exactly at threshold, not beyond)
    const r = groupCentroid(makeArrows([{ x: 96, y: 100 }]))
    expect(r.direction).toBe('Centered')
  })
})

describe('clockDistribution', () => {
  it('returns zero counts for empty arrows', () => {
    const dist = clockDistribution([])
    expect(Object.values(dist).reduce((s, n) => s + n, 0)).toBe(0)
  })

  it('classifies arrows at spot center as center', () => {
    const dist = clockDistribution(makeArrows([{ x: 100, y: 100 }]))
    expect(dist['center']).toBe(1)
  })

  it('classifies arrow to the right as 3h', () => {
    const dist = clockDistribution(makeArrows([{ x: 130, y: 100 }]))
    expect(dist['3h']).toBe(1)
  })

  it('classifies arrow to the left as 9h', () => {
    const dist = clockDistribution(makeArrows([{ x: 70, y: 100 }]))
    expect(dist['9h']).toBe(1)
  })

  it('classifies arrow above (low SVG y) as 12h', () => {
    // In SVG, low y = high visually = 12h
    const dist = clockDistribution(makeArrows([{ x: 100, y: 70 }]))
    expect(dist['12h']).toBe(1)
  })

  it('classifies arrow below (high SVG y) as 6h', () => {
    const dist = clockDistribution(makeArrows([{ x: 100, y: 130 }]))
    expect(dist['6h']).toBe(1)
  })
})

describe('flagOutliers', () => {
  it('returns empty for empty input', () => {
    expect(flagOutliers([])).toEqual([])
  })

  it('does not flag any outlier when all arrows are at the same position', () => {
    const arrows = makeArrows([{ x: 100, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 100 }])
    const result = flagOutliers(arrows)
    expect(result.every(a => !a.isOutlier)).toBe(true)
  })

  it('flags a clear outlier far from the group', () => {
    const arrows = makeArrows([
      { x: 100, y: 100 }, { x: 101, y: 100 },
      { x: 99, y: 100 },  { x: 100, y: 101 },
      { x: 150, y: 150 }, // outlier
    ])
    const result = flagOutliers(arrows)
    expect(result[4].isOutlier).toBe(true)
    expect(result.slice(0, 4).every(a => !a.isOutlier)).toBe(true)
  })
})

describe('suggestPatterns', () => {
  const roundDispersion = { sdX: 5, sdY: 5, ratio: 1, orientation: 'round' as const }
  const leftCentroid = { x: 90, y: 100, magnitude: 10, direction: 'Left' }
  const centeredCentroid = { x: 100, y: 100, magnitude: 0, direction: 'Centered' }

  it('returns empty array when dominantHand is null', () => {
    expect(suggestPatterns(roundDispersion, leftCentroid, null)).toEqual([])
  })

  it('suggests release tension for right-handed archer with left-biased group', () => {
    const hints = suggestPatterns(roundDispersion, leftCentroid, 'right')
    expect(hints.some(h => h.cause.toLowerCase().includes('release'))).toBe(true)
  })

  it('suggests mental game / routine for round group with no bias (right-handed)', () => {
    const hints = suggestPatterns(roundDispersion, centeredCentroid, 'right')
    expect(hints.some(h => h.cause.toLowerCase().includes('routine'))).toBe(true)
  })
})

describe('endConsistency', () => {
  it('returns 0 for sessions with fewer than 2 ends', () => {
    expect(endConsistency(makeSession([]))).toBe(0)
    expect(endConsistency(makeSession([['X', '5', '4']]))).toBe(0)
  })

  it('returns 0 for perfectly consistent ends', () => {
    // All ends score 14 → std dev = 0
    const session = makeSession([['X', '5', '4'], ['X', '5', '4'], ['X', '5', '4']])
    expect(endConsistency(session)).toBeCloseTo(0)
  })

  it('returns correct std dev for varied ends', () => {
    // ends: [14, 6] → mean=10, variance=((14-10)^2+(6-10)^2)/2=16, sd=4
    const session: SessionData = {
      id: 'test', modality: 'INDOOR', targetVariant: '1-SPOT',
      createdAt: '2026-01-01T00:00:00Z',
      ends: [
        { id: 'e0', index: 0, arrows: [{ id:'a0', index:0, score:'X', points:5, isX:true, x:100,y:100 }, { id:'a1', index:1, score:'5', points:5, isX:false, x:100,y:100 }, { id:'a2', index:2, score:'4', points:4, isX:false, x:100,y:100 }] },
        { id: 'e1', index: 1, arrows: [{ id:'a3', index:0, score:'3', points:3, isX:false, x:100,y:100 }, { id:'a4', index:1, score:'2', points:2, isX:false, x:100,y:100 }, { id:'a5', index:2, score:'1', points:1, isX:false, x:100,y:100 }] },
      ],
    }
    expect(endConsistency(session)).toBeCloseTo(4)
  })
})

describe('progressionSeries', () => {
  const sessions = [
    { modality: 'INDOOR' as const, createdAt: '2026-03-01T00:00:00Z', total: 220, meanSpread: 8.2 },
    { modality: 'FLINT' as const,  createdAt: '2026-02-01T00:00:00Z', total: 180, meanSpread: 12.1 },
    { modality: 'INDOOR' as const, createdAt: '2026-01-01T00:00:00Z', total: 210, meanSpread: 9.5 },
  ]

  it('returns empty for empty input', () => {
    expect(progressionSeries([], 'score')).toEqual([])
  })

  it('returns sorted by date ascending', () => {
    const result = progressionSeries(sessions, 'score')
    expect(result[0].date).toBe('2026-01-01T00:00:00Z')
    expect(result[2].date).toBe('2026-03-01T00:00:00Z')
  })

  it('returns total for score metric', () => {
    const result = progressionSeries(sessions, 'score')
    expect(result[2].value).toBe(220)
  })

  it('returns meanSpread for groupRadius metric', () => {
    const result = progressionSeries(sessions, 'groupRadius')
    expect(result[0].value).toBeCloseTo(9.5)
  })
})

describe('personalRecords', () => {
  const sessions = [
    { id: 's1', modality: 'INDOOR' as const, createdAt: '2026-01-01T00:00:00Z', total: 220, meanSpread: 8.2, bestEnd: 27, totalX: 5 },
    { id: 's2', modality: 'INDOOR' as const, createdAt: '2026-02-01T00:00:00Z', total: 235, meanSpread: 6.1, bestEnd: 30, totalX: 8 },
    { id: 's3', modality: 'FLINT' as const,  createdAt: '2026-03-01T00:00:00Z', total: 180, meanSpread: 12.0, bestEnd: 24, totalX: 2 },
  ]

  it('returns all null for empty input', () => {
    const pr = personalRecords([])
    expect(pr.bestScoreIndoor).toBeNull()
    expect(pr.bestScoreFlint).toBeNull()
    expect(pr.bestEnd).toBeNull()
    expect(pr.tightestGroup).toBeNull()
    expect(pr.mostX).toBeNull()
  })

  it('picks best indoor score', () => {
    const pr = personalRecords(sessions)
    expect(pr.bestScoreIndoor?.sessionId).toBe('s2')
    expect(pr.bestScoreIndoor?.value).toBe(235)
  })

  it('picks best flint score', () => {
    const pr = personalRecords(sessions)
    expect(pr.bestScoreFlint?.sessionId).toBe('s3')
    expect(pr.bestScoreFlint?.value).toBe(180)
  })

  it('picks best single end', () => {
    const pr = personalRecords(sessions)
    expect(pr.bestEnd?.sessionId).toBe('s2')
    expect(pr.bestEnd?.value).toBe(30)
  })

  it('picks tightest group (lowest meanSpread)', () => {
    const pr = personalRecords(sessions)
    expect(pr.tightestGroup?.sessionId).toBe('s2')
    expect(pr.tightestGroup?.value).toBeCloseTo(6.1)
  })

  it('picks most Xs in a single session', () => {
    const pr = personalRecords(sessions)
    expect(pr.mostX?.sessionId).toBe('s2')
    expect(pr.mostX?.value).toBe(8)
  })
})
