'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionData, ArrowData, ScoreValue, EndData, ScoreInference } from '@/lib/domain/types'
import { getConfig, getArrowDistance, getEndTargetVariant } from '@/lib/domain/rounds'
import { getTargetDef } from '@/lib/domain/target'
import { runningTotals, endTotal } from '@/lib/domain/scoring'
import { api } from '@/lib/api/client'
import { ArcheryTarget } from '@/components/target/ArcheryTarget'
import { EndScoreTable } from '@/components/scoring/EndScoreTable'
import { RunningTotalDisplay } from '@/components/scoring/RunningTotalDisplay'
import { EndProgressBar } from '@/components/session/EndProgressBar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface Props {
  session: SessionData
}

interface Toast {
  id: number
  message: string
}

export function MarkingScreenClient({ session }: Props) {
  const router = useRouter()
  const config = getConfig(session.modality)

  // Find the first incomplete end
  const firstIncompleteEnd = session.ends.findIndex(
    e => e.arrows.length < config.arrowsPerEnd
  )
  const initialEndIndex =
    firstIncompleteEnd >= 0
      ? firstIncompleteEnd
      : session.ends.length < config.totalEnds
      ? session.ends.length
      : config.totalEnds - 1

  const [ends, setEnds] = useState<EndData[]>(session.ends)
  const [currentEndIndex, setCurrentEndIndex] = useState(initialEndIndex)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [, startTransition] = useTransition()

  const currentEnd = ends.find(e => e.index === currentEndIndex)
  const currentArrows = currentEnd?.arrows ?? []
  const currentArrowIndex = currentArrows.length

  const targetVariant = getEndTargetVariant(config, currentEndIndex, session.targetVariant)
  const target = getTargetDef(session.modality, targetVariant)
  const endDist = config.endDistances[currentEndIndex]
  const distance = getArrowDistance(config, currentEndIndex, currentArrowIndex)
  const isWalkUp = endDist?.isWalkUp ?? false

  // Max theoretical score
  const maxTotal = config.totalEnds * config.arrowsPerEnd * 5
  // Running total across completed ends (all ends before current)
  const completedEnds = ends.filter(e => e.arrows.length === config.arrowsPerEnd)
  const totals = runningTotals(completedEnds)
  const runningTotal = totals[totals.length - 1] ?? 0
  const currentEndTotal = endTotal(currentArrows)
  const totalX = ends.flatMap(e => e.arrows).filter(a => a.isX).length

  const isSessionComplete =
    ends.filter(e => e.arrows.length === config.arrowsPerEnd).length >= config.totalEnds

  function addToast(message: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const handleArrowPlaced = useCallback(
    (inference: ScoreInference & { x: number; y: number }) => {
      const arrowIndex = currentArrows.length

      startTransition(async () => {
        // Ensure an End record exists in DB
        let endId = currentEnd?.id
        if (!endId) {
          const res = await fetch(`/api/sessions/${session.id}/ends`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: currentEndIndex }),
          })
          const created = await res.json() as { id: string }
          endId = created.id
        }

        const arrowDist = getArrowDistance(config, currentEndIndex, arrowIndex)

        const result = await api.arrows.create(session.id, endId!, {
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
          const newArrow: ArrowData = {
            ...result.arrow,
            score: result.arrow.score as ScoreValue,
          }

          if (endIdx >= 0) {
            // Update existing arrows (double-hit changes) + append new arrow
            let updatedArrows = next[endIdx].arrows.map(a => {
              const changed = result.updatedArrows.find(u => u.id === a.id)
              return changed ? { ...a, score: changed.score as ScoreValue, points: changed.points, isX: changed.isX } : a
            })
            updatedArrows = [...updatedArrows, newArrow]
            next[endIdx] = { ...next[endIdx], arrows: updatedArrows }
          } else {
            next.push({
              id: endId!,
              index: currentEndIndex,
              arrows: [newArrow],
            })
          }
          return next
        })

        const newArrowCount = currentArrows.length + 1
        if (newArrowCount >= config.arrowsPerEnd) {
          if (currentEndIndex + 1 >= config.totalEnds) {
            // Session complete
            router.push(`/sessions/${session.id}/summary`)
          } else {
            setCurrentEndIndex(prev => prev + 1)
          }
        }
      })
    },
    [currentEnd, currentArrows, currentEndIndex, config, session.id, router]
  )

  const handleScoreOverride = useCallback(
    async (arrowId: string, score: ScoreValue) => {
      await api.arrows.update(arrowId, score)
      setEnds(prev =>
        prev.map(e => ({
          ...e,
          arrows: e.arrows.map(a =>
            a.id === arrowId
              ? { ...a, score, points: score === 'X' ? 5 : score === 'M' ? 0 : parseInt(score), isX: score === 'X' }
              : a
          ),
        }))
      )
    },
    []
  )

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
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex justify-center">
            <ArcheryTarget
              target={target}
              arrows={currentArrows}
              onArrowPlaced={handleArrowPlaced}
              disabled={false}
            />
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
              arrows={currentArrows}
              config={config}
              endIndex={currentEndIndex}
              isWalkUp={isWalkUp}
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
