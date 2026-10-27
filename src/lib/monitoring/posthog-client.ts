import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
    capture_exceptions: false,
  })
  initialized = true
}

export const analytics = {
  capture(event: string, properties?: Record<string, unknown>) {
    if (!initialized) return
    posthog.capture(event, properties)
  },
  identify(userId: string, properties?: Record<string, unknown>) {
    if (!initialized) return
    posthog.identify(userId, properties)
  },
  reset() {
    if (!initialized) return
    posthog.reset()
  },
}
