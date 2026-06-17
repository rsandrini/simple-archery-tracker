import type { ScoreValue, Modality, TargetVariant } from '@/lib/domain/types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  sessions: {
    list: () =>
      fetch('/api/sessions').then(r => json(r)),

    create: (modality: Modality, targetVariant: TargetVariant) =>
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modality, targetVariant }),
      }).then(r => json(r)),

    get: (id: string) =>
      fetch(`/api/sessions/${id}`).then(r => json(r)),

    update: (id: string, data: { notes?: string; rating?: number | null }) =>
      fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => json(r)),
  },

  arrows: {
    create: (
      sessionId: string,
      endId: string,
      data: {
        index: number
        score: ScoreValue
        x: number
        y: number
        distance?: string
        spotIndex?: number | null
      }
    ) =>
      fetch(`/api/sessions/${sessionId}/ends/${endId}/arrows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => json(r)),

    update: (id: string, score: ScoreValue) =>
      fetch(`/api/arrows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      }).then(r => json(r)),
  },
}
