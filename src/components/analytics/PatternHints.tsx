'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Hint } from '@/lib/domain/types'

interface Props {
  hints: Hint[]
  dominantHand: string | null
}

export function PatternHints({ hints, dominantHand }: Props) {
  const t = useTranslations('PatternHints')
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('title')}</span>
        <span className="text-gray-400 dark:text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {dominantHand === null ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.rich('setDominantHand', {
                link: (chunks) => <Link href="/settings" className="text-blue-600 dark:text-blue-400 underline">{chunks}</Link>
              })}
            </p>
          ) : hints.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noPatterns')}</p>
          ) : (
            hints.map((hint, i) => (
              <div key={i} className="border-l-2 border-blue-400 dark:border-blue-500 pl-3 space-y-0.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('pattern', { pattern: hint.pattern })}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('cause', { cause: hint.cause })}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('observe', { observe: hint.observe })}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
