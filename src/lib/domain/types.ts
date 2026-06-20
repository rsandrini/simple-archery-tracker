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
  strokeColor?: string
  strokeWidth?: number
}

export interface TargetDef {
  variant: TargetVariant
  modality: Modality
  spots: SpotDef[]
  rings: RingDef[]
  background: string
  arrowRadius: number
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

export type DominantHand = 'right' | 'left'

export type ClockSector = '12h' | '1-2h' | '3h' | '4-5h' | '6h' | '7-8h' | '9h' | '10-11h' | 'center'

export interface Hint {
  pattern: string
  cause: string
  observe: string
}

export interface PREntry {
  value: number
  sessionId: string
  date: string
  modality: Modality
}

export interface PersonalRecords {
  bestScoreIndoor: PREntry | null
  bestScoreFlint: PREntry | null
  bestEnd: PREntry | null
  tightestGroup: PREntry | null
  mostX: PREntry | null
}

export interface ProgressionPoint {
  date: string
  value: number
  modality: Modality
}
