'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { TargetRings } from '@/components/target/TargetRings'
import { ArrowDot } from '@/components/target/ArrowDot'
import { sessionSummary, sortArrowsDescending, scoreToPoints, isX } from '@/lib/domain/scoring'
import { getConfig } from '@/lib/domain/rounds'
import { getTargetDef, SVG_SIZE } from '@/lib/domain/target'
import { api } from '@/lib/api/client'
import type { SessionData, ScoreValue, ArrowData, TargetDef } from '@/lib/domain/types'

interface Props {
  session: SessionData
  initialNotes: string
  initialRating: number | null
}

// ─── Shot chart helpers ──────────────────────────────────────────────────────

function scoreToColor(score: ScoreValue): string {
  const map: Record<ScoreValue, string> = {
    X: '#15803d', '5': '#22c55e', '4': '#84cc16',
    '3': '#eab308', '2': '#f97316', '1': '#ef4444', M: '#dc2626',
  }
  return map[score]
}

function groupStats(arrows: ArrowData[], spotCx: number, spotCy: number) {
  const cx = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const cy = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const dists = arrows.map(a => Math.hypot(a.x - cx, a.y - cy))
  const groupRadius = dists.length > 1 ? Math.max(...dists) : 0
  const meanSpread = dists.reduce((s, d) => s + d, 0) / (dists.length || 1)
  return { cx, cy, groupRadius, meanSpread, offset: Math.hypot(cx - spotCx, cy - spotCy) }
}

function qualityInfo(meanSpread: number, refRadius: number) {
  const p = meanSpread / refRadius
  if (p < 0.12) return { label: 'Tight',    cls: 'text-green-600 dark:text-green-400' }
  if (p < 0.28) return { label: 'Good',     cls: 'text-blue-600 dark:text-blue-400' }
  if (p < 0.50) return { label: 'Moderate', cls: 'text-yellow-600 dark:text-yellow-400' }
  return           { label: 'Spread',    cls: 'text-red-500 dark:text-red-400' }
}

function aimDirection(cx: number, cy: number, spotCx = 100, spotCy = 100): string {
  const dx = cx - spotCx
  const dy = cy - spotCy  // positive = below in SVG = Low in archery
  const t = 4
  const v = dy < -t ? 'High' : dy > t ? 'Low' : ''
  const h = dx < -t ? 'Left' : dx > t ? 'Right' : ''
  return v && h ? `${v}-${h}` : v || h || 'Centered'
}

function Crosshair({ x, y, arm = 5, w = 0.8 }: { x: number; y: number; arm?: number; w?: number }) {
  return (
    <g>
      {/* White halo so the + is visible over any ring colour */}
      <line x1={x - arm} y1={y} x2={x + arm} y2={y} stroke="white" strokeWidth={w * 3} strokeLinecap="round" />
      <line x1={x} y1={y - arm} x2={x} y2={y + arm} stroke="white" strokeWidth={w * 3} strokeLinecap="round" />
      <line x1={x - arm} y1={y} x2={x + arm} y2={y} stroke="#111" strokeWidth={w} strokeLinecap="round" />
      <line x1={x} y1={y - arm} x2={x} y2={y + arm} stroke="#111" strokeWidth={w} strokeLinecap="round" />
    </g>
  )
}

// 1-spot full-size chart
function SingleSpotView({ arrows, target, title }: { arrows: ArrowData[]; target: TargetDef; title?: string }) {
  const spot = target.spots[0]
  const stats = groupStats(arrows, spot.cx, spot.cy)
  const q = qualityInfo(stats.meanSpread, spot.spotRadius)
  const aim = aimDirection(stats.cx, stats.cy)

  return (
    <div>
      {title && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>}
      <div className="flex justify-center mb-3">
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full max-w-xs aspect-square">
          {target.spots.map(s => (
            <TargetRings key={s.index} spot={s} rings={target.rings} background={target.background} />
          ))}
          {stats.groupRadius > 0 && (
            <circle cx={stats.cx} cy={stats.cy} r={stats.groupRadius}
              fill="rgba(59,130,246,0.06)" stroke="#3b82f6" strokeWidth={0.6} strokeDasharray="2 1.5" />
          )}
          {arrows.map(a => <ArrowDot key={a.id} x={a.x} y={a.y} color={scoreToColor(a.score)} dotRadius={target.arrowRadius} />)}
          <Crosshair x={stats.cx} y={stats.cy} arm={6} />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Avg group radius</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.meanSpread.toFixed(1)}</p>
          <p className={`text-xs font-semibold mt-0.5 ${q.cls}`}>{q.label}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Aim offset</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.offset.toFixed(1)}</p>
          <p className="text-xs font-semibold mt-0.5 text-gray-600 dark:text-gray-400">{aim}</p>
        </div>
      </div>
    </div>
  )
}

// Per-spot mini charts (multi-spot targets)
function PerSpotView({ arrows, target, title }: { arrows: ArrowData[]; target: TargetDef; title?: string }) {
  const bySpot = new Map<number, ArrowData[]>()
  for (const a of arrows) {
    const idx = a.spotIndex ?? 0
    if (!bySpot.has(idx)) bySpot.set(idx, [])
    bySpot.get(idx)!.push(a)
  }
  const PAD = 8

  return (
    <div>
      {title && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>}
      <div className="grid grid-cols-2 gap-3">
        {target.spots.map(spot => {
          const spotArrows = bySpot.get(spot.index) ?? []
          if (spotArrows.length === 0) return null
          const r = spot.spotRadius + PAD
          const vb = `${spot.cx - r} ${spot.cy - r} ${r * 2} ${r * 2}`
          const stats = groupStats(spotArrows, spot.cx, spot.cy)
          const q = qualityInfo(stats.meanSpread, spot.spotRadius)
          const aim = aimDirection(stats.cx, stats.cy, spot.cx, spot.cy)

          return (
            <div key={spot.index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">Spot {spot.index + 1}</p>
              <svg viewBox={vb} className="w-full aspect-square">
                <TargetRings spot={spot} rings={target.rings} background={target.background} />
                {stats.groupRadius > 0 && (
                  <circle cx={stats.cx} cy={stats.cy} r={stats.groupRadius}
                    fill="rgba(59,130,246,0.06)" stroke="#3b82f6" strokeWidth={0.4} strokeDasharray="1.5 1" />
                )}
                {spotArrows.map(a => <ArrowDot key={a.id} x={a.x} y={a.y} color={scoreToColor(a.score)} dotRadius={target.arrowRadius} />)}
                <Crosshair x={stats.cx} y={stats.cy} arm={3} w={0.6} />
              </svg>
              <div className="text-center text-xs mt-1.5 space-y-0.5">
                <span className={`font-semibold ${q.cls}`}>{q.label}</span>
                <span className="text-gray-400 dark:text-gray-500"> · Ø {stats.meanSpread.toFixed(1)}</span>
                <div className="text-gray-500 dark:text-gray-400">{aim}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShotChart({ session }: { session: SessionData }) {
  const allArrows = session.ends.flatMap(e => e.arrows)
  if (allArrows.length === 0) return null

  // Arrows with spotIndex=null were shot on a 1-spot target
  // Arrows with spotIndex set were shot on a multi-spot target
  const singleArrows = allArrows.filter(a => a.spotIndex == null)
  const multiArrows  = allArrows.filter(a => a.spotIndex != null)

  const singleTarget = getTargetDef(session.modality, '1-SPOT')
  const multiVariant = session.modality === 'INDOOR' ? '5-SPOT' : '4-SPOT'
  const multiTarget  = getTargetDef(session.modality, multiVariant)
  const hasBoth = singleArrows.length > 0 && multiArrows.length > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Shot chart</h2>

      {singleArrows.length > 0 && (
        <SingleSpotView
          arrows={singleArrows}
          target={singleTarget}
          title={hasBoth ? 'Single-face target (all ends combined)' : undefined}
        />
      )}

      {multiArrows.length > 0 && (
        <PerSpotView
          arrows={multiArrows}
          target={multiTarget}
          title={hasBoth ? 'Multi-face target — per spot' : undefined}
        />
      )}
    </div>
  )
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

export function SummaryClient({ session: initialSession, initialNotes, initialRating }: Props) {
  const [session, setSession] = useState(initialSession)
  const [notes, setNotes] = useState(initialNotes)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
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
      </div>
    </div>
  )
}
