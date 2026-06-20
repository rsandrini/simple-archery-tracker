import { redirect } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import SettingsClient from './SettingsClient'
import { getAuthenticatedUserId } from '@/lib/auth-utils'

export default async function SettingsPage() {
  const userId = await getAuthenticatedUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, dominantHand: true },
  })
  if (!user) redirect('/login')

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
