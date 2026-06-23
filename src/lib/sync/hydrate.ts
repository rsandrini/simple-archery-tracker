import db from '@/lib/db/local'
import type { SessionData } from '@/lib/domain/types'

export async function hydrateSession(session: SessionData): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.sessions, db.ends, db.arrows, async () => {
    await db.sessions.put({
      id: session.id,
      modality: session.modality,
      targetVariant: session.targetVariant,
      createdAt: session.createdAt,
      notes: null,
      rating: null,
      updatedAt: now,
      _syncStatus: 'synced',
    })

    for (const end of session.ends) {
      await db.ends.put({
        id: end.id,
        sessionId: session.id,
        index: end.index,
        _syncStatus: 'synced',
      })

      for (const arrow of end.arrows) {
        await db.arrows.put({
          id: arrow.id,
          endId: end.id,
          sessionId: session.id,
          index: arrow.index,
          score: arrow.score,
          points: arrow.points,
          isX: arrow.isX,
          x: arrow.x,
          y: arrow.y,
          distance: arrow.distance ?? null,
          spotIndex: arrow.spotIndex ?? null,
          updatedAt: now,
          _syncStatus: 'synced',
        })
      }
    }
  })
}

export async function hydrateSessionList(
  sessions: Array<{ id: string; modality: string; targetVariant: string; createdAt: string }>
): Promise<void> {
  const now = new Date().toISOString()
  await db.sessions.bulkPut(
    sessions.map(s => ({
      id: s.id,
      modality: s.modality,
      targetVariant: s.targetVariant,
      createdAt: s.createdAt,
      notes: null,
      rating: null,
      updatedAt: now,
      _syncStatus: 'synced' as const,
    }))
  )
}
