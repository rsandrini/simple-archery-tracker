'use client'

import type { TargetDef } from '@/lib/domain/types'
import { SVG_SIZE } from '@/lib/domain/target'
import { TargetRings } from './TargetRings'
import { ArrowDot } from './ArrowDot'

const ZOOM_WINDOW = 40   // SVG units shown around the held point
const ZOOM_DISPLAY = 180 // pixel size of the zoomed SVG — always fixed

interface Props {
  clickX: number
  clickY: number
  target: TargetDef
  existingArrows: Array<{ x: number; y: number; score: string }>
  liveScore?: string
  color?: string
  arrowScale?: number
}

export function ZoomOverlay({ clickX, clickY, target, existingArrows, liveScore, color = '#FF4136', arrowScale = 1 }: Props) {
  const half = ZOOM_WINDOW / 2
  const vx = Math.max(0, Math.min(SVG_SIZE - ZOOM_WINDOW, clickX - half))
  const vy = Math.max(0, Math.min(SVG_SIZE - ZOOM_WINDOW, clickY - half))

  return (
    // pointer-events: none so all touch/mouse events fall through to the SVG below
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col items-center gap-2">
        <p className="text-xs font-medium text-gray-500 tracking-wide">Release to place arrow</p>
        <svg
          width={ZOOM_DISPLAY}
          height={ZOOM_DISPLAY}
          viewBox={`${vx} ${vy} ${ZOOM_WINDOW} ${ZOOM_WINDOW}`}
          className="border border-gray-200 rounded-lg"
        >
          {target.spots.map(spot => (
            <TargetRings key={spot.index} spot={spot} rings={target.rings} background={target.background} />
          ))}
          {existingArrows.map((a, i) => (
            <ArrowDot key={i} x={a.x} y={a.y} dotRadius={target.arrowRadius * arrowScale} />
          ))}
          {/* Crosshair — yellow stays visible on any target colour */}
          <line x1={clickX - 4} y1={clickY} x2={clickX + 4} y2={clickY} stroke="#FACC15" strokeWidth={0.5} strokeLinecap="round" />
          <line x1={clickX} y1={clickY - 4} x2={clickX} y2={clickY + 4} stroke="#FACC15" strokeWidth={0.5} strokeLinecap="round" />
          {/* Live dot — halved so it doesn't obscure the target in the zoom */}
          <circle cx={clickX} cy={clickY} r={target.arrowRadius / 2 * arrowScale} fill={color} />
          {liveScore && (
            <text
              x={clickX + 6}
              y={clickY - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={4}
              fontWeight="bold"
              fill="#FF4136"
              stroke="white"
              strokeWidth={0.5}
              paintOrder="stroke"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {liveScore}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
