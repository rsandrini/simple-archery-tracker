import { describe, it, expect } from 'vitest'
import { validateArrowCoords, isValidCoordinate } from '@/lib/arrow-validation'

describe('isValidCoordinate', () => {
  it('accepts finite numbers', () => {
    expect(isValidCoordinate(0)).toBe(true)
    expect(isValidCoordinate(100)).toBe(true)
    expect(isValidCoordinate(-5.5)).toBe(true)
  })
  it('rejects NaN', () => {
    expect(isValidCoordinate(NaN)).toBe(false)
  })
  it('rejects Infinity', () => {
    expect(isValidCoordinate(Infinity)).toBe(false)
    expect(isValidCoordinate(-Infinity)).toBe(false)
  })
  it('rejects null', () => {
    expect(isValidCoordinate(null)).toBe(false)
  })
  it('rejects string', () => {
    expect(isValidCoordinate('100')).toBe(false)
  })
  it('rejects undefined', () => {
    expect(isValidCoordinate(undefined)).toBe(false)
  })
})

describe('validateArrowCoords', () => {
  it('returns null for valid coordinates', () => {
    expect(validateArrowCoords(100, 50)).toBeNull()
    expect(validateArrowCoords(0, 0)).toBeNull()
    expect(validateArrowCoords(199.9, 0.1)).toBeNull()
  })
  it('returns error for NaN x', () => {
    expect(validateArrowCoords(NaN, 50)).toBe('x and y must be finite numbers')
  })
  it('returns error for NaN y', () => {
    expect(validateArrowCoords(100, NaN)).toBe('x and y must be finite numbers')
  })
  it('returns error for Infinity', () => {
    expect(validateArrowCoords(Infinity, 50)).toBe('x and y must be finite numbers')
  })
  it('returns error for string coordinates', () => {
    expect(validateArrowCoords('100' as unknown, 50)).toBe('x and y must be finite numbers')
  })
  it('returns error for null coordinates', () => {
    expect(validateArrowCoords(null, 50)).toBe('x and y must be finite numbers')
  })
})
