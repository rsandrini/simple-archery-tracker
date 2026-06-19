import type { ScoreValue, TargetVariant, Modality } from '@/lib/domain/types'

const VALID_SCORES = new Set<string>(['X', '5', '4', '3', '2', '1', 'M'])
const VALID_VARIANTS = new Set<string>(['1-SPOT', '5-SPOT', '4-SPOT'])
const VALID_MODALITIES = new Set<string>(['INDOOR', 'FLINT'])

export function isValidScore(v: unknown): v is ScoreValue {
  return typeof v === 'string' && VALID_SCORES.has(v)
}

export function isValidVariant(v: unknown): v is TargetVariant {
  return typeof v === 'string' && VALID_VARIANTS.has(v)
}

export function isValidModality(v: unknown): v is Modality {
  return typeof v === 'string' && VALID_MODALITIES.has(v)
}
