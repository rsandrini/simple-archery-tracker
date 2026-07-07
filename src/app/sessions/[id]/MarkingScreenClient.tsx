'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionData, ArrowData, ScoreValue, EndData, ScoreInference } from '@/lib/domain/types'
import { getConfig, getArrowDistance, getEndTargetVariant } from '@/lib/domain/rounds'
import { getTargetDef } from '@/lib/domain/target'
import { runningTotals, endTotal, scoreToPoints, isX } from '@/lib/domain/scoring'
import { offlineApi as api } from '@/lib/sync/offline-api'
import { ArcheryTarget } from '@/components/target/ArcheryTarget'
import { EndScoreTable } from '@/components/scoring/EndScoreTable'
import { RunningTotalDisplay } from '@/components/scoring/RunningTotalDisplay'
import { EndProgressBar } from '@/components/session/EndProgressBar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { hydrateSession } from '@/lib/sync/hydrate'

interface Props {
  session: SessionData
}

interface Toast {
  id: number
  message: string
}

function findInitialEndIndex(ends: EndData[], config: ReturnType<typeof getConfig>): number {
  const firstIncomplete = ends.findIndex(e => e.arrows.length < config.arrowsPerEnd)
  if (firstIncomplete >= 0) return firstIncomplete
  if (ends.length < config.totalEnds) return ends.length
  return config.totalEnds - 1
}

export function MarkingScreenClient({ session }: Props) {
  const router = useRouter()
  const config = getConfig(session.modality)

  const [ends, setEnds] = useState<EndData[]>(session.ends)
  const [currentEndIndex, setCurrentEndIndex] = useState(() => findInitialEndIndex(session.ends, config))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [undoing, setUndoing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [arrowScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    const saved = localStorage.getItem('arquearia:arrowScale')
    const parsed = saved ? parseFloat(saved) : 1
    return isNaN(parsed) ? 1 : Math.min(1, Math.max(0.5, parsed))
  })

  const savingRef = useRef(false)
  const toastCounter = useRef(0)

  const currentEnd = ends.find(e => e.index === currentEndIndex)
  const currentArrows = currentEnd?.arrows ?? []
  const prevEnd = ends.find(e => e.index === currentEndIndex - 1)
  // Ghost arrows only make sense on Indoor — Flint changes target every end
  const ghostArrows = session.modality === 'INDOOR' && currentArrows.length === 0
    ? (prevEnd?.arrows ?? [])
    : []
  const currentArrowIndex = currentArrows.length

  const targetVariant = getEndTargetVariant(config, currentEndIndex, session.targetVariant)
  const target = getTargetDef(session.modality, targetVariant)
  const endDist = config.endDistances[currentEndIndex]
  const distance = getArrowDistance(config, currentEndIndex, currentArrowIndex)
  const isWalkUp = endDist?.isWalkUp ?? false

  const maxTotal = config.totalEnds * config.arrowsPerEnd * 5

  const { runningTotal, currentEndTotal, totalX } = useMemo(() => {
    const completedEnds = ends.filter(e => e.arrows.length === config.arrowsPerEnd)
    const totals = runningTotals(completedEnds)
    return {
      runningTotal: totals[totals.length - 1] ?? 0,
      currentEndTotal: endTotal(currentArrows),
      totalX: ends.flatMap(e => e.arrows).filter(a => a.isX).length,
    }
  }, [ends, currentArrows, config.arrowsPerEnd])

  const isSessionComplete =
    ends.filter(e => e.arrows.length === config.arrowsPerEnd).length >= config.totalEnds

  function addToast(message: string) {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const handleArrowPlaced = useCallback(
    async (inference: ScoreInference & { x: number; y: number }) => {
      if (savingRef.current) return
      savingRef.current = true
      setSaving(true)

      const arrowIndex = currentArrows.length

      try {
        // Ensure an End record exists in DB
        let endId = currentEnd?.id
        if (!endId) {
          const created = await api.ends.create(session.id, currentEndIndex)
          endId = created.id
        }

        const arrowDist = getArrowDistance(config, currentEndIndex, arrowIndex)

        const result = await api.arrows.create(session.id, endId, {
          index: arrowIndex,
          score: inference.score,
          x: inference.x,
          y: inference.y,
          distance: arrowDist,
          spotIndex: inference.spotIndex,
        }) as { arrow: ArrowData; updatedArrows: ArrowData[] }

        if (result.updatedArrows.length > 0) {
          addToast(`Double hit on spot ${result.updatedArrows[0]?.spotIndex ?? ''}! Lower score counted.`)
        }

        setEnds(prev => {
          const next = [...prev]
          const endIdx = next.findIndex(e => e.index === currentEndIndex)
          const newArrow: ArrowData = { ...result.arrow, score: result.arrow.score as ScoreValue }

          if (endIdx >= 0) {
            let updatedArrows = next[endIdx].arrows.map(a => {
              const changed = result.updatedArrows.find(u => u.id === a.id)
              return changed
                ? { ...a, score: changed.score as ScoreValue, points: changed.points, isX: changed.isX }
                : a
            })
            updatedArrows = [...updatedArrows, newArrow]
            next[endIdx] = { ...next[endIdx], arrows: updatedArrows }
          } else {
            next.push({ id: endId!, index: currentEndIndex, arrows: [newArrow] })
          }
          return next
        })

        const newArrowCount = currentArrows.length + 1
        if (newArrowCount >= config.arrowsPerEnd) {
          if (currentEndIndex + 1 >= config.totalEnds) {
            router.push(`/sessions/${session.id}/summary`)
          } else {
            setCurrentEndIndex(prev => prev + 1)
          }
        }
      } catch {
        addToast('Failed to save arrow — please try again')
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [currentEnd, currentArrows, currentEndIndex, config, session.id, router]
  )

  const handleUndo = useCallback(async () => {
    if (undoing) return
    const targetEndIndex = currentArrows.length === 0 ? currentEndIndex - 1 : currentEndIndex
    const targetArrows = currentArrows.length === 0 ? (prevEnd?.arrows ?? []) : currentArrows
    if (targetArrows.length === 0) return
    const lastArrow = [...targetArrows].sort((a, b) => b.index - a.index)[0]
    setUndoing(true)
    try {
      await api.arrows.delete(lastArrow.id)
      setEnds(prev => prev.map(e =>
        e.index === targetEndIndex
          ? { ...e, arrows: e.arrows.filter(a => a.id !== lastArrow.id) }
          : e
      ))
      if (targetEndIndex !== currentEndIndex) setCurrentEndIndex(targetEndIndex)
    } catch {
      addToast('Failed to undo — please try again')
    } finally {
      setUndoing(false)
    }
  }, [currentArrows, currentEndIndex, prevEnd, undoing])

  const handleScoreOverride = useCallback(
    async (arrowId: string, score: ScoreValue) => {
      try {
        await api.arrows.update(arrowId, score)
        setEnds(prev =>
          prev.map(e => ({
            ...e,
            arrows: e.arrows.map(a =>
              a.id === arrowId
                ? { ...a, score, points: scoreToPoints(score), isX: isX(score) }
                : a
            ),
          }))
        )
      } catch {
        addToast('Failed to update score — please try again')
      }
    },
    []
  )

  useEffect(() => {
    hydrateSession(session).catch(() => {}) // best-effort; never block the UI
  }, [session.id]) // only re-run if the session ID changes

  useEffect(() => {
    if (isSessionComplete) {
      router.push(`/sessions/${session.id}/summary`)
    }
  }, [isSessionComplete, router, session.id])

  if (isSessionComplete) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← Sessions</a>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {session.modality === 'INDOOR' ? 'Indoor Round' : 'Flint Round'}
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href={`/sessions/${session.id}/summary`} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Summary
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <EndProgressBar
          endIndex={currentEndIndex}
          totalEnds={config.totalEnds}
          arrowIndex={currentArrowIndex}
          arrowsPerEnd={config.arrowsPerEnd}
          distance={distance}
          targetVariant={targetVariant}
          isWalkUp={isWalkUp}
          currentTotal={runningTotal + currentEndTotal}
          maxTotal={maxTotal}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-2">
            <ArcheryTarget
              target={target}
              arrows={currentArrows}
              ghostArrows={ghostArrows}
              onArrowPlaced={handleArrowPlaced}
              disabled={saving}
              arrowScale={arrowScale}
            />
            <button
              onClick={handleUndo}
              disabled={undoing || (currentArrows.length === 0 && (prevEnd?.arrows ?? []).length === 0)}
              className="w-full max-w-sm py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14L4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
              {undoing ? 'Undoing…' : 'Undo last arrow'}
            </button>
          </div>

          <div className="space-y-3">
            <RunningTotalDisplay
              runningTotal={runningTotal + currentEndTotal}
              maxTotal={maxTotal}
              totalX={totalX}
              endIndex={currentEndIndex}
              totalEnds={config.totalEnds}
            />

            <EndScoreTable
              ends={ends}
              config={config}
              currentEndIndex={currentEndIndex}
              onScoreOverride={handleScoreOverride}
            />
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className="bg-orange-600 text-white text-sm rounded-lg px-4 py-2 shadow-lg">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
