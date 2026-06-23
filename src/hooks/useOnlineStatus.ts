'use client'

import { useEffect, useState } from 'react'
import { flushQueue, pendingCount } from '@/lib/sync/manager'

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)

    const onOnline = async () => {
      setOnline(true)
      const count = await pendingCount()
      if (count === 0) return
      setSyncing(true)
      await flushQueue()
      setSyncing(false)
      setPending(await pendingCount())
    }

    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Also flush any queue left from a previous offline session
    pendingCount().then(c => {
      setPending(c)
      if (c > 0 && navigator.onLine) onOnline()
    })

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { online, syncing, pending }
}
