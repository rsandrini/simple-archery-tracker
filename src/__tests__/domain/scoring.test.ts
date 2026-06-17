import { describe, it, expect } from 'vitest'
import {
  scoreToPoints,
  isX,
  endTotal,
  sortArrowsDescending,
  runningTotals,
  sessionSummary,
  resolveDoubleHit,
} from '@/lib/domain/scoring'
import type { ArrowData, EndData, SessionData } from '@/lib/domain/types'

function makeArrow(overrides: Partial<ArrowData> & { score: ArrowData['score'] }): ArrowData {
  return {
    id: overrides.id ?? 'a1',
    index: overrides.index ?? 0,
    score: overrides.score,
    points: overrides.points ?? scoreToPoints(overrides.score),
    isX: overrides.isX ?? (overrides.score === 'X'),
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    spotIndex: overrides.spotIndex ?? null,
  }
}

describe('scoreToPoints', () => {
  it('X returns 5', () => expect(scoreToPoints('X')).toBe(5))
  it('5 returns 5', () => expect(scoreToPoints('5')).toBe(5))
  it('4 returns 4', () => expect(scoreToPoints('4')).toBe(4))
  it('3 returns 3', () => expect(scoreToPoints('3')).toBe(3))
  it('2 returns 2', () => expect(scoreToPoints('2')).toBe(2))
  it('1 returns 1', () => expect(scoreToPoints('1')).toBe(1))
  it('M returns 0', () => expect(scoreToPoints('M')).toBe(0))
})

describe('isX', () => {
  it('returns true for X', () => expect(isX('X')).toBe(true))
  it('returns false for 5', () => expect(isX('5')).toBe(false))
  it('returns false for M', () => expect(isX('M')).toBe(false))
})

describe('endTotal', () => {
  it('sums arrow points', () => {
    const arrows = [makeArrow({ score: 'X' }), makeArrow({ score: '4' }), makeArrow({ score: 'M' })]
    expect(endTotal(arrows)).toBe(9)
  })

  it('returns 0 for empty end', () => expect(endTotal([])).toBe(0))

  it('perfect indoor end = 25', () => {
    const arrows = Array.from({ length: 5 }, () => makeArrow({ score: 'X' }))
    expect(endTotal(arrows)).toBe(25)
  })
})

describe('sortArrowsDescending', () => {
  it('orders X > 5 > 4 > 3 > 2 > 1 > M', () => {
    const arrows = ['M', '1', 'X', '3', '5', '2', '4'].map(s =>
      makeArrow({ score: s as ArrowData['score'] })
    )
    const sorted = sortArrowsDescending(arrows).map(a => a.score)
    expect(sorted).toEqual(['X', '5', '4', '3', '2', '1', 'M'])
  })

  it('does not mutate original array', () => {
    const arrows = [makeArrow({ score: 'M' }), makeArrow({ score: 'X' })]
    sortArrowsDescending(arrows)
    expect(arrows[0].score).toBe('M')
  })
})

describe('runningTotals', () => {
  it('accumulates totals across ends', () => {
    const ends: EndData[] = [
      { id: 'e1', index: 0, arrows: [makeArrow({ score: '5' }), makeArrow({ score: '4' })] },
      { id: 'e2', index: 1, arrows: [makeArrow({ score: '3' }), makeArrow({ score: 'M' })] },
      { id: 'e3', index: 2, arrows: [makeArrow({ score: 'X' })] },
    ]
    expect(runningTotals(ends)).toEqual([9, 12, 17])
  })

  it('returns empty array for no ends', () => {
    expect(runningTotals([])).toEqual([])
  })
})

describe('sessionSummary', () => {
  const session: SessionData = {
    id: 's1',
    modality: 'INDOOR',
    targetVariant: '1-SPOT',
    createdAt: '2026-01-01',
    ends: [
      { id: 'e1', index: 0, arrows: [makeArrow({ score: 'X', id: 'a1' }), makeArrow({ score: '3', id: 'a2' })] },
      { id: 'e2', index: 1, arrows: [makeArrow({ score: 'M', id: 'a3' }), makeArrow({ score: '5', id: 'a4' })] },
    ],
  }

  it('calculates total correctly', () => {
    expect(sessionSummary(session).total).toBe(13)
  })

  it('counts X correctly', () => {
    expect(sessionSummary(session).totalX).toBe(1)
  })

  it('per-end arrows are sorted descending', () => {
    const summary = sessionSummary(session)
    expect(summary.perEnd[1].arrows.map(a => a.score)).toEqual(['5', 'M'])
  })

  it('running totals accumulate', () => {
    const summary = sessionSummary(session)
    expect(summary.perEnd[0].runningTotal).toBe(8)
    expect(summary.perEnd[1].runningTotal).toBe(13)
  })
})

describe('resolveDoubleHit', () => {
  it('no collision on single-spot (spotIndex null) — appends normally', () => {
    const existing = [makeArrow({ score: '5', id: 'a1', spotIndex: null })]
    const newArrow = makeArrow({ score: '4', id: 'a2', spotIndex: null })
    const result = resolveDoubleHit(existing, newArrow)
    expect(result).toHaveLength(2)
    expect(result[1].score).toBe('4')
  })

  it('no collision on different spots — appends normally', () => {
    const existing = [makeArrow({ score: '5', id: 'a1', spotIndex: 0 })]
    const newArrow = makeArrow({ score: '4', id: 'a2', spotIndex: 1 })
    const result = resolveDoubleHit(existing, newArrow)
    expect(result).toHaveLength(2)
    expect(result[1].score).toBe('4')
  })

  // Rule: lower VALUE stays valid; higher VALUE becomes M.
  // e.g. arrow on 5 + arrow on 3 → 3 is valid, 5 becomes M (lower point total kept)
  it('collision: existing higher value (5) → existing becomes M, new lower value (3) stays', () => {
    const existing = [makeArrow({ score: '5', id: 'a1', spotIndex: 2 })]
    const newArrow = makeArrow({ score: '3', id: 'a2', spotIndex: 2 })
    const result = resolveDoubleHit(existing, newArrow)
    expect(result).toHaveLength(2)
    expect(result[0].score).toBe('M')   // existing 5 → M
    expect(result[0].points).toBe(0)
    expect(result[1].score).toBe('3')   // new 3 stays valid
  })

  it('collision: new arrow higher value (5) → new becomes M, existing lower value (3) stays', () => {
    const existing = [makeArrow({ score: '3', id: 'a1', spotIndex: 2 })]
    const newArrow = makeArrow({ score: '5', id: 'a2', spotIndex: 2 })
    const result = resolveDoubleHit(existing, newArrow)
    expect(result).toHaveLength(2)
    expect(result[0].score).toBe('3')   // existing 3 stays valid
    expect(result[1].score).toBe('M')   // new 5 → M
    expect(result[1].points).toBe(0)
  })

  it('collision: equal scores → new arrow becomes M', () => {
    const existing = [makeArrow({ score: '4', id: 'a1', spotIndex: 1 })]
    const newArrow = makeArrow({ score: '4', id: 'a2', spotIndex: 1 })
    const result = resolveDoubleHit(existing, newArrow)
    expect(result[0].score).toBe('4')   // existing stays
    expect(result[1].score).toBe('M')   // new becomes M
  })
})
