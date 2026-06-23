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
        return api.sessions.create(modality, targetVariant)
          // Replace the server-generated id with our client id
          // (server will use our id because we pass it)
          .catch(async () => {
            await db.sessions.update(id, { _syncStatus: 'pending' })
            await enqueue('POST', '/api/sessions', { id, modality, targetVariant })
            return { id, modality, targetVariant, createdAt: now, ends: [] }
          })
      }

      await enqueue('POST', '/api/sessions', { id, modality, targetVariant })
      return { id, modality, targetVariant, createdAt: now, ends: [] }
    },
  },

  ends: {
    create: async (sessionId: string, index: number) => {
      const id = crypto.randomUUID()

      await db.ends.add({ id, sessionId, index, _syncStatus: 'pending' })

      if (isOnline()) {
        try {
          const result = await api.ends.create(sessionId, index)
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
          const result = await api.arrows.create(sessionId, endId, { ...data, id } as typeof data & { id: string })
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
