export type Modality = 'INDOOR' | 'FLINT'
export type TargetVariant = '1-SPOT' | '5-SPOT' | '4-SPOT'
export type ScoreValue = 'X' | '5' | '4' | '3' | '2' | '1' | 'M'

export interface SpotDef {
  index: number
  cx: number
  cy: number
  spotRadius: number
}

export interface RingDef {
  score: ScoreValue
  outerRadius: number
  fill: string
}

export interface TargetDef {
  variant: TargetVariant
  modality: Modality
  spots: SpotDef[]
  rings: RingDef[]
  background: string
}

export interface EndDistance {
  endIndex: number
  distance: string
  targetVariant: TargetVariant
  isWalkUp: boolean
  arrowDistances?: string[]
}

export interface RoundConfig {
  id: Modality
  name: string
  totalEnds: number
  arrowsPerEnd: number
  validScores: ScoreValue[]
  endDistances: EndDistance[]
}

export interface ArrowData {
  id: string
  index: number
  score: ScoreValue
  points: number
  isX: boolean
  x: number
  y: number
  distance?: string | null
  spotIndex?: number | null
}

export interface EndData {
  id: string
  index: number
  arrows: ArrowData[]
}

export interface SessionData {
  id: string
  modality: Modality
  targetVariant: TargetVariant
  createdAt: string
  ends: EndData[]
}

export interface EndSummary {
  endIndex: number
  arrows: ArrowData[]
  endTotal: number
  runningTotal: number
}

export interface SessionSummary {
  total: number
  totalX: number
  perEnd: EndSummary[]
}

export interface ScoreInference {
  score: ScoreValue
  spotIndex: number | null
}
