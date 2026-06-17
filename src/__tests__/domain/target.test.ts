import { describe, it, expect } from 'vitest'
import { inferScoreFromCoords, ARROW_DOT_RADIUS, SVG_CENTER } from '@/lib/domain/target'

describe('inferScoreFromCoords — Indoor 1-spot', () => {
  it('center returns X', () => {
    const r = inferScoreFromCoords(SVG_CENTER, SVG_CENTER, 'INDOOR', '1-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBeNull()
  })

  it('dot edge exactly at X boundary (radius 8) returns X', () => {
    // edge = center + 8 - ARROW_DOT_RADIUS, so click at center + 8 - ARROW_DOT_RADIUS
    const x = SVG_CENTER + 8 - ARROW_DOT_RADIUS
    const r = inferScoreFromCoords(x, SVG_CENTER, 'INDOOR', '1-SPOT')
    expect(r.score).toBe('X')
  })

  it('just outside X ring returns 5', () => {
    // Edge must clear X boundary (radius 8): need dist > 8 + ARROW_DOT_RADIUS = 11
    const x = SVG_CENTER + 12
    const r = inferScoreFromCoords(x, SVG_CENTER, 'INDOOR', '1-SPOT')
    expect(r.score).toBe('5')
  })

  it('inside 4-ring returns 4', () => {
    const x = SVG_CENTER + 25
    const r = inferScoreFromCoords(x, SVG_CENTER, 'INDOOR', '1-SPOT')
    expect(r.score).toBe('4')
  })

  it('beyond outer ring returns M', () => {
    const x = SVG_CENTER + 90
    const r = inferScoreFromCoords(x, SVG_CENTER, 'INDOOR', '1-SPOT')
    expect(r.score).toBe('M')
  })
})

describe('inferScoreFromCoords — Indoor 5-spot', () => {
  it('click on top-left spot center returns X with spotIndex 0', () => {
    const r = inferScoreFromCoords(42, 42, 'INDOOR', '5-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBe(0)
  })

  it('click on center spot (100,100) returns X with spotIndex 2', () => {
    const r = inferScoreFromCoords(100, 100, 'INDOOR', '5-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBe(2)
  })

  it('click far from any spot returns M with spotIndex null', () => {
    const r = inferScoreFromCoords(100, 5, 'INDOOR', '5-SPOT')
    expect(r.score).toBe('M')
    expect(r.spotIndex).toBeNull()
  })
})

describe('inferScoreFromCoords — Flint 1-spot', () => {
  it('center returns X', () => {
    const r = inferScoreFromCoords(SVG_CENTER, SVG_CENTER, 'FLINT', '1-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBeNull()
  })

  it('inside 5-zone returns 5', () => {
    const x = SVG_CENTER + 12
    const r = inferScoreFromCoords(x, SVG_CENTER, 'FLINT', '1-SPOT')
    expect(r.score).toBe('5')
  })

  it('inside 4-zone returns 4', () => {
    const x = SVG_CENTER + 35
    const r = inferScoreFromCoords(x, SVG_CENTER, 'FLINT', '1-SPOT')
    expect(r.score).toBe('4')
  })

  it('inside 3-zone returns 3', () => {
    const x = SVG_CENTER + 65
    const r = inferScoreFromCoords(x, SVG_CENTER, 'FLINT', '1-SPOT')
    expect(r.score).toBe('3')
  })

  it('beyond outer ring returns M', () => {
    const x = SVG_CENTER + 85
    const r = inferScoreFromCoords(x, SVG_CENTER, 'FLINT', '1-SPOT')
    expect(r.score).toBe('M')
  })
})

describe('inferScoreFromCoords — Flint 4-spot', () => {
  it('click on top-left spot center returns X with spotIndex 0', () => {
    const r = inferScoreFromCoords(50, 50, 'FLINT', '4-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBe(0)
  })

  it('click on bottom-right spot center returns X with spotIndex 3', () => {
    const r = inferScoreFromCoords(150, 150, 'FLINT', '4-SPOT')
    expect(r.score).toBe('X')
    expect(r.spotIndex).toBe(3)
  })

  it('click in dead zone between spots returns M', () => {
    const r = inferScoreFromCoords(100, 100, 'FLINT', '4-SPOT')
    expect(r.score).toBe('M')
    expect(r.spotIndex).toBeNull()
  })
})
