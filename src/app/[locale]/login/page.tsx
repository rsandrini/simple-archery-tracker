'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { Suspense } from 'react'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { APP_VERSION } from '@/lib/version'

function LoginForm() {
  const t = useTranslations('Login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const justReset = searchParams.get('reset') === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError(t('error'))
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gray-900">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          poster="/images/5spot.gif"
        >
          <source src="/images/5spot.webm" type="video/webm" />
          <source src="/images/5spot.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-blue-900/40" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="text-xl font-bold">Quiver</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90">{APP_VERSION}</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Form card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>

          {justReset && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center bg-green-50 dark:bg-green-900/30 rounded-lg py-2">
              {t('resetSuccess')}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('password')}
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            {t('noAccount')}{' '}
            <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
