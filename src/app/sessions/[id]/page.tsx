import { notFound, redirect } from 'next/navigation'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { getSessionForUser, toSessionData } from '@/lib/db/session-queries'
import { MarkingScreenClient } from './MarkingScreenClient'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId()
  if (!userId) redirect('/login')

  const { id } = await params
  const session = await getSessionForUser(id, userId)
  if (!session) notFound()

  return <MarkingScreenClient session={toSessionData(session)} />
}
