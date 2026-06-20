'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Hint } from '@/lib/domain/types'

interface Props {
  hints: Hint[]
  dominantHand: string | null
}

export function PatternHints({ hints, dominantHand }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pattern hints</span>
        <span className="text-gray-400 dark:text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {dominantHand === null ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/settings" className="text-blue-600 dark:text-blue-400 underline">Set your dominant hand in Settings</Link>
              {' '}to see pattern suggestions.
            </p>
          ) : hints.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No significant patterns detected in this session.</p>
          ) : (
            hints.map((hint, i) => (
              <div key={i} className="border-l-2 border-blue-400 dark:border-blue-500 pl-3 space-y-0.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{hint.pattern}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Possible cause: {hint.cause}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Observe: {hint.observe}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
