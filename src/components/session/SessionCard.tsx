'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  modality: string
  targetVariant: string
  createdAt: string
  endCount: number
  rating?: number | null
}

const modalityLabel: Record<string, string> = {
  INDOOR: 'Indoor Round',
  FLINT: 'Flint Round',
}

const variantLabel: Record<string, string> = {
  '1-SPOT': '1 spot',
  '5-SPOT': '5 spot',
  '4-SPOT': '4 spot',
}

export function SessionCard({ id, modality, targetVariant, createdAt, endCount, rating }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)

  const date = new Date(createdAt)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const totalEnds = modality === 'INDOOR' ? 12 : 7
  const isComplete = endCount >= totalEnds

  const handleDelete = async () => {
    if (deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 p-4">
        <div className="mb-3">
          <p className="font-semibold text-red-800 dark:text-red-300">Delete this session?</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
            {modalityLabel[modality] ?? modality} · {formatted}
          </p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-1">This cannot be undone.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group">
      <Link href={isComplete ? `/sessions/${id}/summary` : `/sessions/${id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{modalityLabel[modality] ?? modality}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatted}</p>
            {rating != null && (
              <p className="text-xs mt-1 text-yellow-500">
                {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 pr-6">
            <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
              {variantLabel[targetVariant] ?? targetVariant}
            </span>
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
              isComplete
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}>
              {isComplete ? 'Complete' : `End ${endCount}/${totalEnds}`}
            </span>
          </div>
        </div>
      </Link>

      <button
        onClick={() => setConfirming(true)}
        title="Delete session"
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}
