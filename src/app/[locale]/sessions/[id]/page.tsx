import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/navigation'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { getSessionForUser, toSessionData } from '@/lib/db/session-queries'
import { MarkingScreenClient } from './MarkingScreenClient'

export default async function SessionPage({
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

  const session = await getSessionForUser(id, userId)
  if (!session) notFound()

  return <MarkingScreenClient session={toSessionData(session)} />
}
