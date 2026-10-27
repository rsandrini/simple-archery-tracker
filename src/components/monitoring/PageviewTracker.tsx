'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/monitoring/posthog-client'

export function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    analytics.capture('$pageview', {
      $current_url: query ? `${pathname}?${query}` : pathname,
    })
  }, [pathname, searchParams])

  return null
}
