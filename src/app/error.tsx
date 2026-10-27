'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The error has been reported. You can try again or head back home.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
