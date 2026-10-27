import prisma from '@/lib/db/prisma'
import type { SessionData } from '@/lib/domain/types'
import { computeSessionGroupTightness } from '@/lib/domain/analytics'

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

function computeEndConsistency(ends: { arrows: { points: number }[] }[]): number {
  if (ends.length < 2) return 0
  const pts = ends.map(e => e.arrows.reduce((s, a) => s + a.points, 0))
  const mean = pts.reduce((s, p) => s + p, 0) / pts.length
  return Math.sqrt(pts.reduce((s, p) => s + (p - mean) ** 2, 0) / pts.length)
}

export async function getProgressionData(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  return sessions.map(s => {
    const allArrows = s.ends.flatMap(e => e.arrows)
    const total = allArrows.reduce((sum, a) => sum + a.points, 0)
    const totalX = allArrows.filter(a => a.isX).length
    const bestEnd = Math.max(0, ...s.ends.map(e => e.arrows.reduce((sum, a) => sum + a.points, 0)))
    const groupTightness = computeSessionGroupTightness(allArrows, s.modality as 'INDOOR' | 'FLINT')
    const consistency = computeEndConsistency(s.ends)
    return {
      id: s.id,
      modality: s.modality as 'INDOOR' | 'FLINT',
      createdAt: s.createdAt.toISOString(),
      total,
      totalX,
      bestEnd,
      groupTightness,
      consistency,
    }
  })
}
