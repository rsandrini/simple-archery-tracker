'use client'

import { useTranslations } from 'next-intl'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function SyncBanner() {
  const t = useTranslations('SyncBanner')
  const { online, syncing, pending } = useOnlineStatus()

  if (online && !syncing && pending === 0) return null

  return (
    <div className={`fixed bottom-0 inset-x-0 z-50 px-4 py-2 text-center text-xs font-medium transition-colors ${
      !online
        ? 'bg-gray-800 text-gray-200'
        : syncing
          ? 'bg-blue-600 text-white'
          : 'bg-green-600 text-white'
    }`}>
      {!online && t('offline')}
      {online && syncing && t('syncing')}
      {online && !syncing && pending > 0 && t('pending', { count: pending })}
    </div>
  )
}
