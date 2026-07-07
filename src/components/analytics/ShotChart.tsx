'use client'

import { ArrowDot } from '@/components/target/ArrowDot'
import { TargetRings } from '@/components/target/TargetRings'
import { getTargetDef, SVG_SIZE } from '@/lib/domain/target'
import { dispersionEllipse } from '@/lib/domain/analytics'
import type { ArrowData, ScoreValue, SessionData, TargetDef } from '@/lib/domain/types'

const SCORE_COLORS: Record<ScoreValue, string> = {
  X: '#15803d', '5': '#22c55e', '4': '#84cc16',
  '3': '#eab308', '2': '#f97316', '1': '#ef4444', M: '#dc2626',
}

function scoreToColor(score: ScoreValue): string { return SCORE_COLORS[score] }

function groupStats(arrows: ArrowData[], spotCx: number, spotCy: number) {
  const cx = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const cy = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const dists = arrows.map(a => Math.hypot(a.x - cx, a.y - cy))
  const meanSpread = dists.reduce((s, d) => s + d, 0) / (dists.length || 1)
  return { cx, cy, meanSpread, offset: Math.hypot(cx - spotCx, cy - spotCy) }
}

function qualityInfo(meanSpread: number, refRadius: number) {
  const p = meanSpread / refRadius
  if (p < 0.12) return { label: 'Tight',    cls: 'text-green-600 dark:text-green-400' }
  if (p < 0.28) return { label: 'Good',     cls: 'text-blue-600 dark:text-blue-400' }
  if (p < 0.50) return { label: 'Moderate', cls: 'text-yellow-600 dark:text-yellow-400' }
  return           { label: 'Spread',    cls: 'text-red-500 dark:text-red-400' }
}

function aimDirection(cx: number, cy: number, spotCx = 100, spotCy = 100): string {
  const dx = cx - spotCx, dy = cy - spotCy, t = 4
  const v = dy < -t ? 'High' : dy > t ? 'Low' : ''
  const h = dx < -t ? 'Left' : dx > t ? 'Right' : ''
  return v && h ? `${v}-${h}` : v || h || 'Centered'
}

function Crosshair({ x, y, arm = 5, w = 0.8 }: { x: number; y: number; arm?: number; w?: number }) {
  return (
    <g>
      <line x1={x-arm} y1={y} x2={x+arm} y2={y} stroke="white" strokeWidth={w*3} strokeLinecap="round" />
      <line x1={x} y1={y-arm} x2={x} y2={y+arm} stroke="white" strokeWidth={w*3} strokeLinecap="round" />
      <line x1={x-arm} y1={y} x2={x+arm} y2={y} stroke="#111" strokeWidth={w} strokeLinecap="round" />
      <line x1={x} y1={y-arm} x2={x} y2={y+arm} stroke="#111" strokeWidth={w} strokeLinecap="round" />
    </g>
  )
}

function OutlierMark({ x, y, r }: { x: number; y: number; r: number }) {
  const arm = r * 0.6
  return (
    <g opacity={0.35}>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#9ca3af" strokeWidth={0.5} />
      <line x1={x-arm} y1={y-arm} x2={x+arm} y2={y+arm} stroke="#9ca3af" strokeWidth={0.7} />
      <line x1={x+arm} y1={y-arm} x2={x-arm} y2={y+arm} stroke="#9ca3af" strokeWidth={0.7} />
    </g>
  )
}

function SingleSpotView({
  arrows, target, outlierFlags, title, arrowScale = 1,
}: {
  arrows: ArrowData[]; target: TargetDef; outlierFlags: Map<string, boolean>; title?: string; arrowScale?: number
}) {
  const spot = target.spots[0]
  const visibleArrows = arrows.filter(a => !outlierFlags.get(a.id))
  const stats = groupStats(visibleArrows.length > 0 ? visibleArrows : arrows, spot.cx, spot.cy)
  const q = qualityInfo(stats.meanSpread, spot.spotRadius)
  const aim = aimDirection(stats.cx, stats.cy)
  const ellipse = dispersionEllipse(visibleArrows.length > 0 ? visibleArrows : arrows)

  return (
    <div>
      {title && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>}
      <div className="flex justify-center mb-3">
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full max-w-xs aspect-square">
          {target.spots.map(s => (
            <TargetRings key={s.index} spot={s} rings={target.rings} background={target.background} />
          ))}
          {(ellipse.sdX > 0 || ellipse.sdY > 0) && (
            <ellipse
              cx={stats.cx} cy={stats.cy}
              rx={Math.max(ellipse.sdX * 2.5, 1)} ry={Math.max(ellipse.sdY * 2.5, 1)}
              fill="rgba(59,130,246,0.06)" stroke="#3b82f6"
              strokeWidth={0.6} strokeDasharray="2 1.5"
            />
          )}
          {arrows.map(a =>
            outlierFlags.get(a.id)
              ? <OutlierMark key={a.id} x={a.x} y={a.y} r={target.arrowRadius * arrowScale * 0.5} />
              : <ArrowDot key={a.id} x={a.x} y={a.y} color={scoreToColor(a.score)} dotRadius={target.arrowRadius * arrowScale * 0.5} />
          )}
          <Crosshair x={stats.cx} y={stats.cy} arm={6} />
        </svg>
      </div>
      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-2">
        Group: {ellipse.orientation.charAt(0).toUpperCase() + ellipse.orientation.slice(1)}
      </p>
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

function PerSpotView({
  arrows, target, outlierFlags, title, arrowScale = 1,
}: {
  arrows: ArrowData[]; target: TargetDef; outlierFlags: Map<string, boolean>; title?: string; arrowScale?: number
}) {
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
          const visibleArrows = spotArrows.filter(a => !outlierFlags.get(a.id))
          const stats = groupStats(visibleArrows.length > 0 ? visibleArrows : spotArrows, spot.cx, spot.cy)
          const q = qualityInfo(stats.meanSpread, spot.spotRadius)
          const aim = aimDirection(stats.cx, stats.cy, spot.cx, spot.cy)
          const ellipse = dispersionEllipse(visibleArrows.length > 0 ? visibleArrows : spotArrows)

          return (
            <div key={spot.index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">Spot {spot.index + 1}</p>
              <svg viewBox={vb} className="w-full aspect-square">
                <TargetRings spot={spot} rings={target.rings} background={target.background} />
                {(ellipse.sdX > 0 || ellipse.sdY > 0) && (
                  <ellipse
                    cx={stats.cx} cy={stats.cy}
                    rx={Math.max(ellipse.sdX * 2.5, 0.5)} ry={Math.max(ellipse.sdY * 2.5, 0.5)}
                    fill="rgba(59,130,246,0.06)" stroke="#3b82f6"
                    strokeWidth={0.4} strokeDasharray="1.5 1"
                  />
                )}
                {spotArrows.map(a =>
                  outlierFlags.get(a.id)
                    ? <OutlierMark key={a.id} x={a.x} y={a.y} r={target.arrowRadius * arrowScale * 0.5} />
                    : <ArrowDot key={a.id} x={a.x} y={a.y} color={scoreToColor(a.score)} dotRadius={target.arrowRadius * arrowScale * 0.5} />
                )}
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

interface ShotChartProps {
  session: SessionData
  outlierFlags?: Map<string, boolean>
  arrowScale?: number
}

export function ShotChart({ session, outlierFlags = new Map(), arrowScale = 1 }: ShotChartProps) {
  const allArrows = session.ends.flatMap(e => e.arrows)
  if (allArrows.length === 0) return null

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
          outlierFlags={outlierFlags}
          arrowScale={arrowScale}
          title={hasBoth ? 'Single-face target (all ends combined)' : undefined}
        />
      )}
      {multiArrows.length > 0 && (
        <PerSpotView
          arrows={multiArrows}
          target={multiTarget}
          outlierFlags={outlierFlags}
          arrowScale={arrowScale}
          title={hasBoth ? 'Multi-face target — per spot' : undefined}
        />
      )}
    </div>
  )
}
