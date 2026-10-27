'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('title')}
        </h1>

        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t.rich('submitted', { emailValue: email, email: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              {t('backToSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? t('sending') : t('send')}
            </button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                {t('backToSignIn')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
