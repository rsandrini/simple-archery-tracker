'use client'

import type { EndData, ScoreValue, RoundConfig } from '@/lib/domain/types'
import { sortArrowsDescending } from '@/lib/domain/scoring'

interface Props {
  ends: EndData[]
  config: RoundConfig
  currentEndIndex: number
  onScoreOverride?: (arrowId: string, score: ScoreValue) => void
}

const scoreColor: Record<ScoreValue, string> = {
  X:   'text-green-700 dark:text-green-400 font-bold',
  '5': 'text-green-600 dark:text-green-500 font-semibold',
  '4': 'text-lime-600 dark:text-lime-400',
  '3': 'text-yellow-600 dark:text-yellow-400',
  '2': 'text-orange-500 dark:text-orange-400',
  '1': 'text-red-500 dark:text-red-400',
  M:   'text-red-700 dark:text-red-500 italic',
}

export function EndScoreTable({ ends, config, currentEndIndex, onScoreOverride }: Props) {
  const rows = Array.from({ length: currentEndIndex + 1 }, (_, i) => {
    const end = ends.find(e => e.index === i)
    return { index: i, arrows: end ? sortArrowsDescending(end.arrows) : [] }
  })

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            {Array.from({ length: config.arrowsPerEnd }, (_, i) => (
              <th key={i} className="px-1 py-2 text-center" />
            ))}
            <th className="px-2 py-2 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map(({ index, arrows }) => {
            const isCurrent = index === currentEndIndex
            const isComplete = arrows.length === config.arrowsPerEnd
            const total = arrows.reduce((s, a) => s + a.points, 0)

            return (
              <tr
                key={index}
                className={isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
              >
                <td className={`px-2 py-2 text-xs font-medium tabular-nums ${
                  isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {index + 1}
                </td>

                {Array.from({ length: config.arrowsPerEnd }, (_, slot) => {
                  const arrow = arrows[slot]
                  return (
                    <td key={slot} className="px-1 py-2 text-center">
                      {arrow ? (
                        onScoreOverride ? (
                          <select
                            value={arrow.score}
                            onChange={e => onScoreOverride(arrow.id, e.target.value as ScoreValue)}
                            className={`bg-transparent border-0 outline-none cursor-pointer text-xs text-center w-full ${scoreColor[arrow.score]}`}
                          >
                            {config.validScores.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs ${scoreColor[arrow.score]}`}>{arrow.score}</span>
                        )
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
                      )}
                    </td>
                  )
                })}

                <td className="px-2 py-2 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                  {isComplete
                    ? total
                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
