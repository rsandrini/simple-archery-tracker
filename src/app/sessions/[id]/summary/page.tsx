import { notFound } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import { SummaryClient } from './SummaryClient'
import type { SessionData } from '@/lib/domain/types'

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <SummaryClient
      session={sessionData}
      initialNotes={session.notes ?? ''}
      initialRating={session.rating ?? null}
    />
  )
}
