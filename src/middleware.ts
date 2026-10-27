import createMiddleware from 'next-intl/middleware'
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = new Set(['/'])
const PUBLIC_PREFIXES = [
  '/login', '/register', '/forgot-password', '/reset-password',
  '/api/auth', '/api/users', '/images',
  '/manifest.json', '/sw.js', '/icons', '/ingest',
]
const LOCALIZED_PUBLIC_PATHS = new Set(routing.locales.map((locale) => `/${locale}`))
const LOCALIZED_PUBLIC_PREFIXES = routing.locales.flatMap((locale) =>
  PUBLIC_PREFIXES.map((prefix) => `/${locale}${prefix}`)
)

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    LOCALIZED_PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    LOCALIZED_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function getLocaleFromPathname(pathname: string): string {
  const firstSegment = pathname.split('/')[1]
  return routing.locales.includes(firstSegment as (typeof routing.locales)[number])
    ? firstSegment
    : routing.defaultLocale
}

export default auth((req) => {
  const response = handleI18nRouting(req)

  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const pathname = req.nextUrl.pathname
  const locale = getLocaleFromPathname(pathname)

  if (!req.auth && !isPublic(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
  }

  if (req.auth && (pathname === `/${locale}/login` || pathname === `/${locale}/register`)) {
    return NextResponse.redirect(new URL(`/${locale}`, req.url))
  }

  return response
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
