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

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.31.205'],
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
  // TODO: replace with your Sentry org slug from sentry.io/organizations/<org>/
  org: 'your-sentry-org-slug',
  // TODO: replace with your Sentry project slug from sentry.io/organizations/<org>/projects/<project>/
  project: 'your-sentry-project-slug',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: false,
}))
