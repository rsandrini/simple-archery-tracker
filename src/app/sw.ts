/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { NetworkOnly, Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes must never be cached — always go to the network.
    // This rule is placed FIRST so it wins before any defaultCache rule.
    {
      matcher: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
        sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    // Cache Next.js static assets aggressively
    ...defaultCache,
  ],
})

serwist.addEventListeners()
