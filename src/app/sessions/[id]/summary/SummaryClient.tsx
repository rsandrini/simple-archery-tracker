'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { EndScoreTable } from '@/components/scoring/EndScoreTable'
import { sessionSummary } from '@/lib/domain/scoring'
import { getConfig } from '@/lib/domain/rounds'
import { api } from '@/lib/api/client'
import type { SessionData, ScoreValue } from '@/lib/domain/types'

interface Props {
  session: SessionData
  initialNotes: string
  initialRating: number | null
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value || 0

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
          title={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={active >= star ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

export function SummaryClient({ session: initialSession, initialNotes, initialRating }: Props) {
  const [session, setSession] = useState(initialSession)
  const [notes, setNotes] = useState(initialNotes)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const config = getConfig(session.modality)
  const summary = sessionSummary(session)
  const maxTotal = session.modality === 'INDOOR' ? 300 : 140
  const pct = ((summary.total / maxTotal) * 100).toFixed(1)

  const persist = useCallback(
    (updates: { notes?: string; rating?: number | null }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaveStatus('saving')
      saveTimer.current = setTimeout(async () => {
        await api.sessions.update(session.id, updates)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      }, 600)
    },
    [session.id]
  )

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setNotes(v)
    persist({ notes: v })
  }

  const handleRatingChange = (v: number) => {
    const next = v === rating ? null : v
    setRating(next)
    persist({ rating: next })
  }

  const handleScoreOverride = useCallback(async (arrowId: string, score: ScoreValue) => {
    await api.arrows.update(arrowId, score)
    setSession(prev => ({
      ...prev,
      ends: prev.ends.map(e => ({
        ...e,
        arrows: e.arrows.map(a =>
          a.id === arrowId
            ? { ...a, score, points: score === 'X' ? 5 : score === 'M' ? 0 : parseInt(score), isX: score === 'X' }
            : a
        ),
      })),
    }))
  }, [])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          ← Sessions
        </Link>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {session.modality === 'INDOOR' ? 'Indoor Round' : 'Flint Round'} — Summary
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href={`/sessions/${session.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Continue
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Score summary card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-end justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total score</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{pct}%</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</span>
            <span className="text-gray-400 dark:text-gray-500">/ {maxTotal}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span><span className="font-semibold text-yellow-700 dark:text-yellow-400">{summary.totalX}</span> × X</span>
            <span><span className="font-semibold text-gray-900 dark:text-gray-100">{session.ends.length}</span> ends shot</span>
          </div>
        </div>

        {/* Rating & Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Session notes</h2>
            <span className={`text-xs transition-opacity ${
              saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
            } ${saveStatus === 'saved' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Rating</p>
            <StarRating value={rating} onChange={handleRatingChange} />
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Comments</p>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="How did this session go? Notes on form, equipment, conditions…"
              rows={3}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            />
          </div>
        </div>

        {/* Per-end breakdown with editable scores */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Tap any score to correct it.</p>
          {summary.perEnd.map(end => {
            const rawEnd = session.ends.find(e => e.index === end.endIndex)
            const isWalkUp = config.endDistances[end.endIndex]?.isWalkUp ?? false
            const dist = config.endDistances[end.endIndex]?.distance ?? ''
            return (
              <div key={end.endIndex} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">End {end.endIndex + 1}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {dist && <span>{dist}</span>}
                    <span>Running: <span className="font-bold text-gray-900 dark:text-gray-100">{end.runningTotal}</span></span>
                  </div>
                </div>
                {rawEnd && (
                  <EndScoreTable
                    arrows={rawEnd.arrows}
                    config={config}
                    endIndex={end.endIndex}
                    isWalkUp={isWalkUp}
                    onScoreOverride={handleScoreOverride}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
