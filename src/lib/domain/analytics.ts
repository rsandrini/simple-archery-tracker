import type { SessionData, ScoreValue } from './types'

const SCORE_VALUES: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

export function pointsPerEnd(session: SessionData): number[] {
  return session.ends.map(e =>
    e.arrows.reduce((sum, a) => sum + a.points, 0)
  )
}

export function scoreDistribution(session: SessionData): Record<ScoreValue, number> {
  const dist = Object.fromEntries(SCORE_VALUES.map(s => [s, 0])) as Record<ScoreValue, number>
  for (const end of session.ends) {
    for (const arrow of end.arrows) {
      dist[arrow.score]++
    }
  }
  return dist
}
