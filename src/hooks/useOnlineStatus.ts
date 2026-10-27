'use client'

import { useEffect, useState } from 'react'
import { pendingCount, onPendingChange, onSyncingChange, scheduleFlush } from '@/lib/sync/manager'

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)

    const unsubPending = onPendingChange(setPending)
    const unsubSyncing = onSyncingChange(setSyncing)

    const onOnline = () => {
      setOnline(true)
      scheduleFlush()
    }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Also flush any queue left from a previous offline session
    pendingCount().then(c => {
      setPending(c)
      if (c > 0 && navigator.onLine) scheduleFlush()
    })

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsubPending()
      unsubSyncing()
    }
  }, [])

  return { online, syncing, pending }
}
