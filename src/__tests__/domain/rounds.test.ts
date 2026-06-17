import { describe, it, expect } from 'vitest'
import { INDOOR_CONFIG, FLINT_CONFIG, getConfig, getArrowDistance, getEndTargetVariant } from '@/lib/domain/rounds'

describe('INDOOR_CONFIG', () => {
  it('has 12 ends', () => expect(INDOOR_CONFIG.totalEnds).toBe(12))
  it('has 5 arrows per end', () => expect(INDOOR_CONFIG.arrowsPerEnd).toBe(5))
  it('all ends at 20yd', () => {
    INDOOR_CONFIG.endDistances.forEach(e => expect(e.distance).toBe('20yd'))
  })
  it('includes X in valid scores', () => expect(INDOOR_CONFIG.validScores).toContain('X'))
  it('includes M in valid scores', () => expect(INDOOR_CONFIG.validScores).toContain('M'))
  it('no walk-up ends', () => {
    INDOOR_CONFIG.endDistances.forEach(e => expect(e.isWalkUp).toBe(false))
  })
})

describe('FLINT_CONFIG', () => {
  it('has 14 ends (2 passes)', () => expect(FLINT_CONFIG.totalEnds).toBe(14))
  it('has 4 arrows per end', () => expect(FLINT_CONFIG.arrowsPerEnd).toBe(4))
  it('does not include 1 or 2 in valid scores', () => {
    expect(FLINT_CONFIG.validScores).not.toContain('1')
    expect(FLINT_CONFIG.validScores).not.toContain('2')
  })

  // First pass
  it('end 0 is 25yd 1-spot', () => {
    const e = FLINT_CONFIG.endDistances[0]
    expect(e.distance).toBe('25yd')
    expect(e.targetVariant).toBe('1-SPOT')
  })
  it('end 1 is 20ft 4-spot', () => {
    const e = FLINT_CONFIG.endDistances[1]
    expect(e.distance).toBe('20ft')
    expect(e.targetVariant).toBe('4-SPOT')
  })
  it('end 4 is 20yd 1-spot', () => {
    const e = FLINT_CONFIG.endDistances[4]
    expect(e.distance).toBe('20yd')
    expect(e.targetVariant).toBe('1-SPOT')
  })
  it('end 5 is 10yd 4-spot', () => {
    const e = FLINT_CONFIG.endDistances[5]
    expect(e.distance).toBe('10yd')
    expect(e.targetVariant).toBe('4-SPOT')
  })
  it('end 6 is walk-up 1-spot', () => {
    const e = FLINT_CONFIG.endDistances[6]
    expect(e.isWalkUp).toBe(true)
    expect(e.targetVariant).toBe('1-SPOT')
    expect(e.arrowDistances).toHaveLength(4)
  })
  it('walk-up distances are 30/25/20/15yd', () => {
    expect(FLINT_CONFIG.endDistances[6].arrowDistances).toEqual(['30yd', '25yd', '20yd', '15yd'])
  })

  // Second pass mirrors first
  it('end 7 repeats end 0 (25yd 1-spot)', () => {
    const e = FLINT_CONFIG.endDistances[7]
    expect(e.distance).toBe('25yd')
    expect(e.targetVariant).toBe('1-SPOT')
    expect(e.endIndex).toBe(7)
  })
  it('end 8 repeats end 1 (20ft 4-spot)', () => {
    const e = FLINT_CONFIG.endDistances[8]
    expect(e.distance).toBe('20ft')
    expect(e.targetVariant).toBe('4-SPOT')
  })
  it('end 13 repeats end 6 (walk-up)', () => {
    const e = FLINT_CONFIG.endDistances[13]
    expect(e.isWalkUp).toBe(true)
    expect(e.arrowDistances).toEqual(['30yd', '25yd', '20yd', '15yd'])
  })
})

describe('getConfig', () => {
  it('returns INDOOR config', () => expect(getConfig('INDOOR').id).toBe('INDOOR'))
  it('returns FLINT config', () => expect(getConfig('FLINT').id).toBe('FLINT'))
  it('throws on unknown modality', () => expect(() => getConfig('FIELD')).toThrow())
})

describe('getArrowDistance', () => {
  it('returns end distance for normal ends', () => {
    expect(getArrowDistance(INDOOR_CONFIG, 0, 0)).toBe('20yd')
    expect(getArrowDistance(INDOOR_CONFIG, 11, 4)).toBe('20yd')
  })
  it('returns end distance for non-walk-up flint ends', () => {
    expect(getArrowDistance(FLINT_CONFIG, 0, 0)).toBe('25yd')
    expect(getArrowDistance(FLINT_CONFIG, 5, 3)).toBe('10yd')
  })
  it('returns per-arrow distance for walk-up end', () => {
    expect(getArrowDistance(FLINT_CONFIG, 6, 0)).toBe('30yd')
    expect(getArrowDistance(FLINT_CONFIG, 6, 1)).toBe('25yd')
    expect(getArrowDistance(FLINT_CONFIG, 6, 2)).toBe('20yd')
    expect(getArrowDistance(FLINT_CONFIG, 6, 3)).toBe('15yd')
  })
})

describe('getEndTargetVariant', () => {
  it('INDOOR returns session targetVariant for all ends', () => {
    expect(getEndTargetVariant(INDOOR_CONFIG, 0, '5-SPOT')).toBe('5-SPOT')
    expect(getEndTargetVariant(INDOOR_CONFIG, 11, '1-SPOT')).toBe('1-SPOT')
  })
  it('FLINT returns config targetVariant regardless of session variant', () => {
    expect(getEndTargetVariant(FLINT_CONFIG, 1, '1-SPOT')).toBe('4-SPOT')
    expect(getEndTargetVariant(FLINT_CONFIG, 0, '4-SPOT')).toBe('1-SPOT')
  })
})
