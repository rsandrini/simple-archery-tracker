import db from '@/lib/db/local'
import type { SessionData } from '@/lib/domain/types'

export async function hydrateSession(session: SessionData): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.sessions, db.ends, db.arrows, async () => {
    // I3: Do not overwrite entities that have pending local changes — the
    // offline edits must survive a page reload.
    const existingSession = await db.sessions.get(session.id)
    if (!existingSession || existingSession._syncStatus !== 'pending') {
      await db.sessions.put({
        id: session.id,
        modality: session.modality,
        targetVariant: session.targetVariant,
        createdAt: session.createdAt,
        // SessionData doesn't carry notes/rating; preserve existing values if
        // the row already exists, otherwise default to null.
        notes: existingSession?.notes ?? null,
        rating: existingSession?.rating ?? null,
        updatedAt: now,
        _syncStatus: 'synced',
      })
    }

    for (const end of session.ends) {
      const existingEnd = await db.ends.get(end.id)
      if (!existingEnd || existingEnd._syncStatus !== 'pending') {
        await db.ends.put({
          id: end.id,
          sessionId: session.id,
          index: end.index,
          _syncStatus: 'synced',
        })
      }

      for (const arrow of end.arrows) {
        const existingArrow = await db.arrows.get(arrow.id)
        if (!existingArrow || existingArrow._syncStatus !== 'pending') {
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
    }
  })
}

export async function hydrateSessionList(
  sessions: Array<{ id: string; modality: string; targetVariant: string; createdAt: string }>
): Promise<void> {
  const now = new Date().toISOString()

  // I3: For the list hydration, only upsert sessions that are not pending locally.
  for (const s of sessions) {
    const existing = await db.sessions.get(s.id)
    if (!existing || existing._syncStatus !== 'pending') {
      await db.sessions.put({
        id: s.id,
        modality: s.modality,
        targetVariant: s.targetVariant,
        createdAt: s.createdAt,
        notes: existing?.notes ?? null,
        rating: existing?.rating ?? null,
        updatedAt: now,
        _syncStatus: 'synced' as const,
      })
    }
  }
}
