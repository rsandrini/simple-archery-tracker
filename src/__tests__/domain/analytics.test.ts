import { describe, it, expect } from 'vitest'
import { pointsPerEnd, scoreDistribution } from '@/lib/domain/analytics'
import type { SessionData, ScoreValue } from '@/lib/domain/types'

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
    const session = makeSession([])
    expect(pointsPerEnd(session)).toEqual([])
  })

  it('returns 0 for an end with no arrows', () => {
    const session = makeSession([[]])
    expect(pointsPerEnd(session)).toEqual([0])
  })
})

describe('scoreDistribution', () => {
  it('counts each score value across all ends', () => {
    const session = makeSession([
      ['X', 'X', '5'],
      ['4', '3', 'M'],
    ])
    expect(scoreDistribution(session)).toEqual({
      X: 2, '5': 1, '4': 1, '3': 1, '2': 0, '1': 0, M: 1,
    })
  })

  it('returns all zeros for empty session', () => {
    const session = makeSession([])
    expect(scoreDistribution(session)).toEqual({
      X: 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, M: 0,
    })
  })
})
