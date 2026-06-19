import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.31.205'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-better-sqlite3', 'better-sqlite3'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default withSentryConfig(nextConfig, {
  // TODO: replace with your Sentry org slug from sentry.io/organizations/<org>/
  org: 'your-sentry-org-slug',
  // TODO: replace with your Sentry project slug from sentry.io/organizations/<org>/projects/<project>/
  project: 'your-sentry-project-slug',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  automaticVercelMonitors: false,
})
