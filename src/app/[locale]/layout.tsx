import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import UserHeader from '@/components/ui/UserHeader'
import { SyncBanner } from '@/components/ui/SyncBanner'
import { PostHogProvider } from '@/components/monitoring/PostHogProvider'
import { PageviewTracker } from '@/components/monitoring/PageviewTracker'
import { routing } from '@/i18n/routing'
import { Suspense } from 'react'
import enMessages from '../../../messages/en.json'
import ptBRMessages from '../../../messages/pt-BR.json'

const messagesByLocale = {
  en: enMessages,
  'pt-BR': ptBRMessages,
} as const

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <NextIntlClientProvider messages={messagesByLocale[locale]} locale={locale} timeZone="UTC">
      <SessionProvider>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PageviewTracker />
          </Suspense>
          <ThemeProvider>
            <UserHeader locale={locale} />
            {children}
          </ThemeProvider>
        </PostHogProvider>
      </SessionProvider>
      <SyncBanner />
    </NextIntlClientProvider>
  )
}
