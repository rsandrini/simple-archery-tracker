import { notFound, redirect } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { getSessionForUser, toSessionData } from '@/lib/db/session-queries'
import prisma from '@/lib/db/prisma'
import { SummaryClient } from './SummaryClient'

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId()
  if (!userId) redirect('/login')

  const { id } = await params
  const [session, user] = await Promise.all([
    getSessionForUser(id, userId),
    prisma.user.findUnique({ where: { id: userId }, select: { dominantHand: true } }),
  ])
  if (!session) notFound()

  return (
    <SummaryClient
      session={toSessionData(session)}
      initialNotes={session.notes ?? ''}
      initialRating={session.rating ?? null}
      dominantHand={user?.dominantHand ?? null}
    />
  )
}
