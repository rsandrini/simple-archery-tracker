import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { APP_VERSION } from '@/lib/version'

interface Props {
  locale: string
}

export async function LandingPage({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'LandingPage' })

  const screenshots = [
    { src: '/images/5spot.gif', alt: t('screenshot5spot'), label: t('screenshot5spot') },
    { src: '/images/main-page.png', alt: t('screenshotSessions'), label: t('screenshotSessions') },
    { src: '/images/arrow-view.png', alt: t('screenshot1spot'), label: t('screenshot1spot') },
    { src: '/images/overview-page.png', alt: t('screenshotOverview'), label: t('screenshotOverview') },
    { src: '/images/analytics1.png', alt: t('screenshotAnalytics1'), label: t('screenshotAnalytics1') },
    { src: '/images/analytics2.png', alt: t('screenshotAnalytics2'), label: t('screenshotAnalytics2') },
    { src: '/images/analytics3.png', alt: t('screenshotAnalytics3'), label: t('screenshotAnalytics3') },
    { src: '/images/analytics4.png', alt: t('screenshotAnalytics4'), label: t('screenshotAnalytics4') },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero with video background */}
      <section className="relative min-h-[90vh] flex flex-col overflow-hidden">
        {/* Background video */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover opacity-60 dark:opacity-50"
            poster="/images/5spot.gif"
          >
            <source src="/images/5spot.webm" type="video/webm" />
            <source src="/images/5spot.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-gray-50 dark:to-gray-900" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-white">Quiver</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90">
                {APP_VERSION}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/login"
              locale={locale}
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/register"
              locale={locale}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {t('getStarted')}
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-3xl text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {t('title')}
              <br />
              <span className="text-blue-400">{t('subtitle')}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
              {t('description')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                locale={locale}
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg"
              >
                {t('createAccount')}
              </Link>
              <Link
                href="/login"
                locale={locale}
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium rounded-xl border-2 border-white/40 text-white hover:bg-white/10 transition-colors"
              >
                {t('haveAccount')}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 pb-6 text-center">
          <span className="text-white/60 text-sm animate-bounce inline-block">↓</span>
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
          {t('galleryTitle')}
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          {t('galleryDescription')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {screenshots.map(item => (
            <div
              key={item.src}
              className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 bg-white dark:bg-gray-800"
            >
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <p className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 dark:bg-blue-700 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            {t('ctaDescription')}
          </p>
          <Link
            href="/register"
            locale={locale}
            className="inline-block px-10 py-4 text-lg font-medium rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-lg"
          >
            {t('ctaButton')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-600">
        <p>{t('footer')}</p>
      </footer>
    </div>
  )
}
