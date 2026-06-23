import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Don't cache API routes — they must reach the server when online
  exclude: [/api\//],
})

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : []

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins,
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-better-sqlite3', 'better-sqlite3', 'pino', 'pino-pretty', 'thread-stream'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // better-sqlite3 spawns worker threads using __dirname-relative paths;
      // bundling it breaks those paths — force it to stay external.
      const existing = Array.isArray(config.externals) ? config.externals : []
      config.externals = [...existing, 'better-sqlite3', '@prisma/adapter-better-sqlite3']
    }
    return config
  },
};

export default withSerwist(withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? '',
  project: process.env.SENTRY_PROJECT ?? '',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
}))
