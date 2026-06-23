'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { sessionSummary, sortArrowsDescending, scoreToPoints, isX } from '@/lib/domain/scoring'
import { getConfig } from '@/lib/domain/rounds'
import { offlineApi as api } from '@/lib/sync/offline-api'
import type { SessionData, ScoreValue } from '@/lib/domain/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'
import { pointsPerEnd, scoreDistribution, dispersionEllipse, groupCentroid, clockDistribution, flagOutliers, suggestPatterns } from '@/lib/domain/analytics'
import { ShotChart } from '@/components/analytics/ShotChart'
import { ClockChart } from '@/components/analytics/ClockChart'
import { PatternHints } from '@/components/analytics/PatternHints'
import type { DominantHand } from '@/lib/domain/types'
import { hydrateSession } from '@/lib/sync/hydrate'

interface Props {
  session: SessionData
  initialNotes: string
  initialRating: number | null
  dominantHand: string | null
}

// ─── Unified arrow table ─────────────────────────────────────────────────────

const scoreColor: Record<ScoreValue, string> = {
  X:   'text-green-700 dark:text-green-400 font-bold',
  '5': 'text-green-600 dark:text-green-500 font-semibold',
  '4': 'text-lime-600 dark:text-lime-400',
  '3': 'text-yellow-600 dark:text-yellow-400',
  '2': 'text-orange-500 dark:text-orange-400',
  '1': 'text-red-500 dark:text-red-400',
  M:   'text-red-700 dark:text-red-500 italic',
}

function UnifiedArrowTable({
  session,
  config,
  onScoreOverride,
}: {
  session: SessionData
  config: ReturnType<typeof getConfig>
  onScoreOverride: (id: string, score: ScoreValue) => void
}) {
  let running = 0

  const rows = session.ends.map(end => {
    const isWalkUp = config.endDistances[end.index]?.isWalkUp ?? false
    const endDist = config.endDistances[end.index]?.distance ?? ''
    const sorted = sortArrowsDescending(end.arrows)
    const total = sorted.reduce((s, a) => s + a.points, 0)
    running += total
    return {
      endIndex: end.index,
      arrows: sorted,
      isWalkUp,
      endDist,
      total,
      running,
    }
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase">
          <tr>
            <th className="px-2 py-2 text-left">End</th>
            {Array.from({ length: config.arrowsPerEnd }, (_, i) => (
              <th key={i} className="px-1 py-2 text-center" />
            ))}
            <th className="px-2 py-2 text-right">End</th>
            <th className="px-2 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map(row => (
            <tr key={row.endIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
              <td className="px-2 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                E{row.endIndex + 1}
              </td>
              {Array.from({ length: config.arrowsPerEnd }, (_, slot) => {
                const arrow = row.arrows[slot]
                return (
                  <td key={slot} className="px-1 py-2 text-center">
                    {arrow ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <select
                          value={arrow.score}
                          onChange={e => onScoreOverride(arrow.id, e.target.value as ScoreValue)}
                          className={`text-center bg-transparent border-0 outline-none cursor-pointer text-xs w-full ${scoreColor[arrow.score]}`}
                        >
                          {config.validScores.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {row.isWalkUp && (
                          <span className="text-gray-300 dark:text-gray-600 text-[10px] leading-none">
                            {config.endDistances[row.endIndex]?.arrowDistances?.[arrow.index] ?? ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
                    )}
                  </td>
                )
              })}
              <td className="px-2 py-2 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                {row.total}
              </td>
              <td className="px-2 py-2 text-right font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                {row.running}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={config.arrowsPerEnd + 3} className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
                No arrows recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
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
          onClick={() => onChange(star)}
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

function FatigueCurve({ session }: { session: SessionData }) {
  const pts = pointsPerEnd(session)
  if (pts.length === 0) return null
  const avg = pts.reduce((s, p) => s + p, 0) / pts.length
  const data = pts.map((p, i) => ({ end: `E${i + 1}`, pts: p }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Points per end</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Avg <span className="font-medium text-gray-600 dark:text-gray-300">{avg.toFixed(1)}</span> pts
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis dataKey="end" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [`${v ?? 0} pts`, 'Score']}
          />
          <ReferenceLine
            y={avg}
            stroke="#9ca3af"
            strokeDasharray="4 2"
            label={{ value: `avg`, position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="pts"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const SCORE_COLORS: Record<ScoreValue, string> = {
  X: '#15803d', '5': '#22c55e', '4': '#84cc16',
  '3': '#eab308', '2': '#f97316', '1': '#ef4444', M: '#dc2626',
}

const SCORE_ORDER: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

function ScoreHistogram({ session }: { session: SessionData }) {
  const dist = scoreDistribution(session)
  const data = SCORE_ORDER.map(s => ({ score: s, count: dist[s], color: SCORE_COLORS[s] }))
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Score distribution</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{total} arrows total</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis dataKey="score" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [v ?? 0, 'arrows']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AnalyticsTab({
  session,
  ignoreFliers,
  setIgnoreFliers,
  dominantHand,
}: {
  session: SessionData
  ignoreFliers: boolean
  setIgnoreFliers: React.Dispatch<React.SetStateAction<boolean>>
  dominantHand: string | null
}) {
  const allArrows = session.ends.flatMap(e => e.arrows)
  const flagged = flagOutliers(allArrows)
  const outlierFlags = new Map(flagged.map(a => [a.id, a.isOutlier]))
  const outlierCount = flagged.filter(a => a.isOutlier).length
  const activeArrows = ignoreFliers ? allArrows.filter(a => !outlierFlags.get(a.id)) : allArrows

  const dispersion = dispersionEllipse(activeArrows)
  const centroid = groupCentroid(activeArrows)
  const clockDist = clockDistribution(activeArrows)
  const hints = suggestPatterns(dispersion, centroid, dominantHand as DominantHand | null)
  const avgPtsPerArrow = allArrows.length > 0
    ? allArrows.reduce((s, a) => s + a.points, 0) / allArrows.length
    : 0

  return (
    <>
      {/* Outlier toggle */}
      <div className="flex items-center justify-end gap-2">
        {outlierCount > 0 && ignoreFliers && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{outlierCount} flier{outlierCount !== 1 ? 's' : ''} excluded</span>
        )}
        {outlierCount > 0 && (
          <button
            onClick={() => setIgnoreFliers(f => !f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              ignoreFliers
                ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            {ignoreFliers ? 'Show all arrows' : 'Ignore fliers'}
          </button>
        )}
      </div>

      {/* Shot chart with ellipse */}
      <ShotChart
        session={session}
        outlierFlags={ignoreFliers ? new Map(allArrows.map(a => [a.id, outlierFlags.get(a.id) ?? false])) : new Map()}
      />

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Avg / arrow</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgPtsPerArrow.toFixed(2)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">of 5.00</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">X rate</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {allArrows.length > 0 ? ((allArrows.filter(a => a.isX).length / allArrows.length) * 100).toFixed(1) : '0.0'}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{allArrows.filter(a => a.isX).length} of {allArrows.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Miss rate</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400">
            {allArrows.length > 0 ? ((allArrows.filter(a => a.score === 'M').length / allArrows.length) * 100).toFixed(1) : '0.0'}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{allArrows.filter(a => a.score === 'M').length} of {allArrows.length}</p>
        </div>
      </div>

      {/* Clock distribution */}
      <ClockChart distribution={clockDist} />

      {/* Pattern hints */}
      <PatternHints hints={hints} dominantHand={dominantHand} />

      {/* Fatigue curve */}
      <FatigueCurve session={session} />

      {/* Score distribution */}
      <ScoreHistogram session={session} />
    </>
  )
}

export function SummaryClient({ session: initialSession, initialNotes, initialRating, dominantHand }: Props) {
  const [session, setSession] = useState(initialSession)
  const [notes, setNotes] = useState(initialNotes)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview')
  const [ignoreFliers, setIgnoreFliers] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const config = getConfig(session.modality)
  const summary = sessionSummary(session)
  const maxTotal = config.totalEnds * config.arrowsPerEnd * 5
  const pct = ((summary.total / maxTotal) * 100).toFixed(1)

  const persist = useCallback(
    (updates: { notes?: string; rating?: number | null }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaveStatus('saving')
      saveTimer.current = setTimeout(async () => {
        try {
          await api.sessions.update(session.id, updates)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 1500)
        } catch {
          setSaveStatus('idle')
        }
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
    try {
      await api.arrows.update(arrowId, score)
      setSession(prev => ({
        ...prev,
        ends: prev.ends.map(e => ({
          ...e,
          arrows: e.arrows.map(a =>
            a.id === arrowId
              ? { ...a, score, points: scoreToPoints(score), isX: isX(score) }
              : a
          ),
        })),
      }))
    } catch {
      // Select reverts to DB value on next render; nothing else needed
    }
  }, [])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  useEffect(() => {
    hydrateSession(session).catch(() => {}) // best-effort; never block the UI
  }, [session.id]) // only re-run if the session ID changes

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

      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'analytics'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors
              ${tab === t
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400'
              }`}
          >
            {t === 'overview' ? 'Overview' : 'Analytics'}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {tab === 'overview' && (
          <>
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

            {/* Shot chart */}
            <ShotChart session={session} />

            {/* All arrows — unified flat table */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Tap any score to correct it.</p>
              <UnifiedArrowTable
                session={session}
                config={config}
                onScoreOverride={handleScoreOverride}
              />
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
          </>
        )}
        {tab === 'analytics' && (
          <AnalyticsTab
            session={session}
            ignoreFliers={ignoreFliers}
            setIgnoreFliers={setIgnoreFliers}
            dominantHand={dominantHand}
          />
        )}
      </div>
    </div>
  )
}
