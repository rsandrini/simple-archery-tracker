import { notFound } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import type { SessionData } from '@/lib/domain/types'
import { MarkingScreenClient } from './MarkingScreenClient'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  if (!session) notFound()

  const sessionData: SessionData = {
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
        score: a.score as Parameters<typeof import('@/lib/domain/scoring').scoreToPoints>[0],
        points: a.points,
        isX: a.isX,
        x: a.x,
        y: a.y,
        distance: a.distance,
        spotIndex: a.spotIndex,
      })),
    })),
  }

  return <MarkingScreenClient session={sessionData} />
}
