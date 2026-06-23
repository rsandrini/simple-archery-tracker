import db from '@/lib/db/local'
import { api } from '@/lib/api/client'
import type { ScoreValue, Modality, TargetVariant } from '@/lib/domain/types'
import { scoreToPoints, isX } from '@/lib/domain/scoring'

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine
}

async function enqueue(method: 'POST' | 'PATCH' | 'DELETE', url: string, body: unknown) {
  await db.mutations.add({
    method,
    url,
    body: body ? JSON.stringify(body) : null,
    createdAt: new Date().toISOString(),
    retries: 0,
  })
}

export const offlineApi = {
  sessions: {
    async update(sessionId: string, data: { notes?: string | null; rating?: number | null }) {
      // Write to local IndexedDB first
      await db.sessions.update(sessionId, { ...data, _syncStatus: 'pending' })
      const url = `/api/sessions/${sessionId}`
      if (isOnline()) {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          await db.sessions.update(sessionId, { _syncStatus: 'synced' })
          return await res.json()
        }
        await enqueue('PATCH', url, data)
      } else {
        await enqueue('PATCH', url, data)
      }
      return { session: { id: sessionId, ...data } }
    },

    create: async (modality: Modality, targetVariant: TargetVariant) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      await db.sessions.add({
        id,
        modality,
        targetVariant,
        createdAt: now,
        notes: null,
        rating: null,
        updatedAt: now,
        _syncStatus: isOnline() ? 'synced' : 'pending',
      })

      if (isOnline()) {
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, modality, targetVariant }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          await db.sessions.update(id, { _syncStatus: 'synced' })
          return data
        } catch {
          await db.sessions.update(id, { _syncStatus: 'pending' })
          await enqueue('POST', '/api/sessions', { id, modality, targetVariant })
          return { id, modality, targetVariant, createdAt: now, ends: [] }
        }
      }

      await enqueue('POST', '/api/sessions', { id, modality, targetVariant })
      return { id, modality, targetVariant, createdAt: now, ends: [] }
    },
  },

  ends: {
    create: async (sessionId: string, index: number): Promise<{ id: string; sessionId: string; index: number }> => {
      const id = crypto.randomUUID()

      await db.ends.add({ id, sessionId, index, _syncStatus: 'pending' })

      if (isOnline()) {
        try {
          const res = await fetch(`/api/sessions/${sessionId}/ends`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, index }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const result = await res.json() as { id: string; sessionId: string; index: number }
          await db.ends.update(id, { _syncStatus: 'synced' })
          return result
        } catch {
          await enqueue('POST', `/api/sessions/${sessionId}/ends`, { id, index })
        }
      } else {
        await enqueue('POST', `/api/sessions/${sessionId}/ends`, { id, index })
      }

      return { id, sessionId, index }
    },
  },

  arrows: {
    create: async (
      sessionId: string,
      endId: string,
      data: { index: number; score: ScoreValue; x: number; y: number; distance?: string; spotIndex?: number | null }
    ) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const pts = scoreToPoints(data.score)
      const xFlag = isX(data.score)

      await db.arrows.add({
        id,
        endId,
        sessionId,
        index: data.index,
        score: data.score,
        points: pts,
        isX: xFlag,
        x: data.x,
        y: data.y,
        distance: data.distance ?? null,
        spotIndex: data.spotIndex ?? null,
        updatedAt: now,
        _syncStatus: 'pending',
      })

      if (isOnline()) {
        try {
          const res = await fetch(`/api/sessions/${sessionId}/ends/${endId}/arrows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const result = await res.json()
          await db.arrows.update(id, { _syncStatus: 'synced' })
          return result
        } catch {
          await enqueue('POST', `/api/sessions/${sessionId}/ends/${endId}/arrows`, { id, ...data })
        }
      } else {
        await enqueue('POST', `/api/sessions/${sessionId}/ends/${endId}/arrows`, { id, ...data })
      }

      // Return the same shape the server would return so callers don't notice the difference
      return {
        arrow: { id, endId, index: data.index, score: data.score, points: pts, isX: xFlag, x: data.x, y: data.y, distance: data.distance ?? null, spotIndex: data.spotIndex ?? null },
        updatedArrows: [],
      }
    },

    update: async (id: string, score: ScoreValue) => {
      const pts = scoreToPoints(score)
      const xFlag = isX(score)
      await db.arrows.update(id, { score, points: pts, isX: xFlag, updatedAt: new Date().toISOString(), _syncStatus: 'pending' })

      if (isOnline()) {
        try {
          const result = await api.arrows.update(id, score)
          await db.arrows.update(id, { _syncStatus: 'synced' })
          return result
        } catch {
          await enqueue('PATCH', `/api/arrows/${id}`, { score })
        }
      } else {
        await enqueue('PATCH', `/api/arrows/${id}`, { score })
      }
    },

    delete: async (id: string) => {
      await db.arrows.delete(id)

      if (isOnline()) {
        try {
          await api.arrows.delete(id)
        } catch {
          await enqueue('DELETE', `/api/arrows/${id}`, null)
        }
      } else {
        await enqueue('DELETE', `/api/arrows/${id}`, null)
      }
    },
  },
}
