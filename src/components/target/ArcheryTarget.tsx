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
  ghostArrows?: ArrowData[]
  onArrowPlaced: (inference: ScoreInference & { x: number; y: number }) => void
  disabled?: boolean
  arrowScale?: number
  scrollMode?: boolean
}

export function ArcheryTarget({ target, arrows, ghostArrows = [], onArrowPlaced, disabled, arrowScale = 1, scrollMode = false }: Props) {
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

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (disabled) return
    const pt = toSVGCoords(clientX, clientY)
    if (!pt) return
    isDragging.current = true
    setDragPoint(pt)
  }, [disabled, toSVGCoords])

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return
    const pt = toSVGCoords(clientX, clientY)
    if (pt) setDragPoint(pt)
  }, [toSVGCoords])

  const endDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return
    isDragging.current = false
    const pt = toSVGCoords(clientX, clientY)
    setDragPoint(null)
    if (!pt) return
    const inference = inferScoreFromCoords(pt.x, pt.y, target.modality, target.variant)
    onArrowPlaced({ ...inference, x: pt.x, y: pt.y })
  }, [toSVGCoords, target, onArrowPlaced])

  const cancelDrag = useCallback(() => {
    isDragging.current = false
    setDragPoint(null)
  }, [])

  // Pointer events for mouse/stylus — skip touch to avoid double-firing
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return
    moveDrag(e.clientX, e.clientY)
  }, [moveDrag])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return
    endDrag(e.clientX, e.clientY)
  }, [endDrag])

  const handlePointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return
    cancelDrag()
  }, [cancelDrag])

  // Touch events — iOS Safari primary interaction path
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (scrollMode) return
    e.preventDefault()
    const t = e.touches[0]
    if (t) startDrag(t.clientX, t.clientY)
  }, [startDrag, scrollMode])

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (scrollMode) return
    e.preventDefault()
    const t = e.touches[0]
    if (t) moveDrag(t.clientX, t.clientY)
  }, [moveDrag, scrollMode])

  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (scrollMode) return
    e.preventDefault()
    const t = e.changedTouches[0]
    if (t) endDrag(t.clientX, t.clientY)
    else cancelDrag()
  }, [endDrag, cancelDrag, scrollMode])

  const dotColors = ['#e74c3c', '#e67e22', '#27ae60', '#2980b9', '#8e44ad']

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className={`w-full max-w-sm aspect-square select-none ${scrollMode ? 'touch-auto opacity-75' : 'touch-none'} ${disabled ? 'opacity-60' : scrollMode ? '' : 'cursor-crosshair'}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={cancelDrag}
      >
        {target.spots.map(spot => (
          <TargetRings key={spot.index} spot={spot} rings={target.rings} background={target.background} />
        ))}
        {ghostArrows.length > 0 && (
          <g opacity={0.28}>
            {ghostArrows.map(arrow => (
              <ArrowDot key={arrow.id} x={arrow.x} y={arrow.y} color="#6b7280" dotRadius={target.arrowRadius * arrowScale} />
            ))}
          </g>
        )}
        {arrows.map((arrow, i) => (
          <ArrowDot
            key={arrow.id}
            x={arrow.x}
            y={arrow.y}
            color={dotColors[i % dotColors.length]}
            label={arrow.score}
            dotRadius={target.arrowRadius * arrowScale}
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
          liveScore={inferScoreFromCoords(dragPoint.x, dragPoint.y, target.modality, target.variant, target.arrowRadius / 2).score}
          color={dotColors[arrows.length % dotColors.length]}
          arrowScale={arrowScale}
        />
      )}
    </>
  )
}
