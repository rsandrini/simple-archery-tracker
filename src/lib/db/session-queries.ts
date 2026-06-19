import prisma from '@/lib/db/prisma'
import type { SessionData } from '@/lib/domain/types'

type PrismaSession = NonNullable<Awaited<ReturnType<typeof fetchSession>>>

async function fetchSession(id: string, userId: string) {
  return prisma.session.findUnique({
    where: { id, userId },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })
}

export function toSessionData(session: PrismaSession): SessionData {
  return {
    id: session.id,
    modality: session.modality as SessionData['modality'],
    targetVariant: session.targetVariant as SessionData['targetVariant'],
    createdAt: session.createdAt.toISOString(),
    ends: session.ends.map(e => ({
      id: e.id,
      index: e.index,
      arrows: e.arrows.map(a => ({
        id: a.id,
        index: a.index,
        score: a.score as SessionData['ends'][0]['arrows'][0]['score'],
        points: a.points,
        isX: a.isX,
        x: a.x,
        y: a.y,
        distance: a.distance ?? undefined,
        spotIndex: a.spotIndex ?? null,
      })),
    })),
  }
}

export async function getSessionForUser(id: string, userId: string) {
  return fetchSession(id, userId)
}
