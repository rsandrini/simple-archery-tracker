import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/navigation'
import prisma from '@/lib/db/prisma'
import SettingsClient from './SettingsClient'
import { getAuthenticatedUserId } from '@/lib/auth-utils'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    redirect({ href: '/login', locale })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, dominantHand: true },
  })
  if (!user) {
    redirect({ href: '/login', locale })
    return
  }

  return (
    <SettingsClient
      user={{
        email: user.email,
        name: user.name ?? '',
        dominantHand: user.dominantHand ?? null,
      }}
    />
  )
}
