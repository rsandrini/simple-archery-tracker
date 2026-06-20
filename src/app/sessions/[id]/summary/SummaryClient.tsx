'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { sessionSummary, sortArrowsDescending, scoreToPoints, isX } from '@/lib/domain/scoring'
import { getConfig } from '@/lib/domain/rounds'
import { api } from '@/lib/api/client'
import type { SessionData, ScoreValue, ArrowData } from '@/lib/domain/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'
import { pointsPerEnd, scoreDistribution, dispersionEllipse, groupCentroid, clockDistribution, flagOutliers, suggestPatterns, endConsistency } from '@/lib/domain/analytics'
import { ShotChart } from '@/components/analytics/ShotChart'
import { ClockChart } from '@/components/analytics/ClockChart'
import { PatternHints } from '@/components/analytics/PatternHints'
import type { DominantHand } from '@/lib/domain/types'

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

interface TableRow {
  arrow: ArrowData
  endIndex: number
  arrowNum: number
  isFirstInEnd: boolean
  endRowCount: number
  dist: string
  running: number
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

  const rows: TableRow[] = session.ends.flatMap(end => {
    const isWalkUp = config.endDistances[end.index]?.isWalkUp ?? false
    const endDist = config.endDistances[end.index]?.distance ?? ''
    const sorted = sortArrowsDescending(end.arrows)
    return sorted.map((arrow, j) => {
      running += arrow.points
      return {
        arrow,
        endIndex: end.index,
        arrowNum: j + 1,
        isFirstInEnd: j === 0,
        endRowCount: sorted.length,
        dist: isWalkUp
          ? (config.endDistances[end.index]?.arrowDistances?.[arrow.index] ?? '—')
          : endDist,
        running,
      }
    })
  })

  const showDist = rows.some(r => r.dist)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase">
          <tr>
            <th className="px-3 py-2 text-left">End</th>
            <th className="px-3 py-2 text-center">#</th>
            {showDist && <th className="px-3 py-2 text-left">Dist</th>}
            <th className="px-3 py-2 text-center">Score</th>
            <th className="px-3 py-2 text-right">Pts</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.arrow.id}
              className={`${row.isFirstInEnd && row.endIndex > 0 ? 'border-t-2 border-gray-200 dark:border-gray-600' : 'border-t border-gray-100 dark:border-gray-700/50'} hover:bg-gray-50 dark:hover:bg-gray-700/20`}
            >
              <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                {row.isFirstInEnd ? `E${row.endIndex + 1}` : ''}
              </td>
              <td className="px-3 py-2 text-center text-gray-400 dark:text-gray-500">{row.arrowNum}</td>
              {showDist && (
                <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{row.dist || '—'}</td>
              )}
              <td className="px-3 py-2 text-center">
                <select
                  value={row.arrow.score}
                  onChange={e => onScoreOverride(row.arrow.id, e.target.value as ScoreValue)}
                  className={`text-center bg-transparent border-0 outline-none cursor-pointer ${scoreColor[row.arrow.score]}`}
                >
                  {config.validScores.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-mono">{row.arrow.points}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{row.running}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={showDist ? 6 : 5} className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
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
            formatter={(v: number) => [`${v} pts`, 'Score']}
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
            formatter={(v: number) => [v, 'arrows']}
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
  const consistency = endConsistency(session)

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

      {/* End consistency */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">End consistency</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{consistency.toFixed(1)}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">pts std dev · lower = more consistent</p>
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
            ? { ...a, score, points: scoreToPoints(score), isX: isX(score) }
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

            {/* All arrows — unified flat table */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Tap any score to correct it.</p>
              <UnifiedArrowTable
                session={session}
                config={config}
                onScoreOverride={handleScoreOverride}
              />
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
