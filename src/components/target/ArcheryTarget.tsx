'use client'

import { useState, useCallback, useRef } from 'react'
import type { TargetDef, ScoreInference, ArrowData } from '@/lib/domain/types'
import { inferScoreFromCoords, SVG_SIZE } from '@/lib/domain/target'
import { TargetRings } from './TargetRings'
import { ArrowDot } from './ArrowDot'
import { ZoomOverlay } from './ZoomOverlay'

interface Props {
  target: TargetDef
  arrows: ArrowData[]
  onArrowPlaced: (inference: ScoreInference & { x: number; y: number }) => void
  disabled?: boolean
}

export function ArcheryTarget({ target, arrows, onArrowPlaced, disabled }: Props) {
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const isDragging = useRef(false)

  const toSVGCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * SVG_SIZE,
      y: ((clientY - rect.top) / rect.height) * SVG_SIZE,
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const pt = toSVGCoords(e.clientX, e.clientY)
      if (!pt) return
      isDragging.current = true
      setDragPoint(pt)
    },
    [disabled, toSVGCoords]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging.current) return
      const pt = toSVGCoords(e.clientX, e.clientY)
      if (pt) setDragPoint(pt)
    },
    [toSVGCoords]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging.current) return
      isDragging.current = false
      const pt = toSVGCoords(e.clientX, e.clientY)
      setDragPoint(null)
      if (!pt) return
      const inference = inferScoreFromCoords(pt.x, pt.y, target.modality, target.variant)
      onArrowPlaced({ ...inference, x: pt.x, y: pt.y })
    },
    [toSVGCoords, target, onArrowPlaced]
  )

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false
    setDragPoint(null)
  }, [])

  const dotColors = ['#e74c3c', '#e67e22', '#27ae60', '#2980b9', '#8e44ad']

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className={`w-full max-w-sm aspect-square touch-none select-none ${disabled ? 'opacity-60' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {target.spots.map(spot => (
          <TargetRings key={spot.index} spot={spot} rings={target.rings} background={target.background} />
        ))}
        {arrows.map((arrow, i) => (
          <ArrowDot
            key={arrow.id}
            x={arrow.x}
            y={arrow.y}
            color={dotColors[i % dotColors.length]}
            label={arrow.score}
          />
        ))}
        {dragPoint && (
          <>
            <line x1={dragPoint.x - 6} y1={dragPoint.y} x2={dragPoint.x + 6} y2={dragPoint.y} stroke="#FF4136" strokeWidth={0.8} strokeLinecap="round" />
            <line x1={dragPoint.x} y1={dragPoint.y - 6} x2={dragPoint.x} y2={dragPoint.y + 6} stroke="#FF4136" strokeWidth={0.8} strokeLinecap="round" />
          </>
        )}
      </svg>

      {dragPoint && (
        <ZoomOverlay
          clickX={dragPoint.x}
          clickY={dragPoint.y}
          target={target}
          existingArrows={arrows}
        />
      )}
    </>
  )
}
