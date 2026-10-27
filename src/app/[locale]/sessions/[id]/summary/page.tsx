import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/navigation'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { getSessionForUser, toSessionData } from '@/lib/db/session-queries'
import prisma from '@/lib/db/prisma'
import { SummaryClient } from './SummaryClient'

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    redirect({ href: '/login', locale })
    return
  }

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
