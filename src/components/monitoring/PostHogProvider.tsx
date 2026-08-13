'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { initPostHog, analytics } from '@/lib/monitoring/posthog-client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const identifiedUserId = useRef<string | null>(null)

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      if (identifiedUserId.current !== session.user.id) {
        analytics.identify(session.user.id, { email: session.user.email })
        identifiedUserId.current = session.user.id
      }
    } else if (status === 'unauthenticated' && identifiedUserId.current !== null) {
      analytics.reset()
      identifiedUserId.current = null
    }
  }, [status, session?.user?.id, session?.user?.email])

  return <>{children}</>
}
