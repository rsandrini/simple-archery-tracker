import type { ArrowData, ScoreValue, RoundConfig } from '@/lib/domain/types'
import { sortArrowsDescending } from '@/lib/domain/scoring'

interface Props {
  arrows: ArrowData[]
  config: RoundConfig
  endIndex: number
  isWalkUp: boolean
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

export function EndScoreTable({ arrows, config, endIndex, isWalkUp, onScoreOverride }: Props) {
  const sorted = sortArrowsDescending(arrows)
  const total = arrows.reduce((s, a) => s + a.points, 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            {isWalkUp && <th className="px-3 py-2 text-left">Dist</th>}
            <th className="px-3 py-2 text-center">Score</th>
            <th className="px-3 py-2 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {sorted.map((arrow, i) => (
            <tr key={arrow.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{i + 1}</td>
              {isWalkUp && (
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                  {config.endDistances[endIndex]?.arrowDistances?.[arrow.index] ?? '—'}
                </td>
              )}
              <td className="px-3 py-2 text-center">
                {onScoreOverride ? (
                  <select
                    value={arrow.score}
                    onChange={e => onScoreOverride(arrow.id, e.target.value as ScoreValue)}
                    className={`text-center bg-transparent border-0 outline-none cursor-pointer ${scoreColor[arrow.score]}`}
                  >
                    {config.validScores.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span className={scoreColor[arrow.score]}>{arrow.score}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-mono">{arrow.points}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={isWalkUp ? 4 : 3} className="px-3 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                No arrows yet
              </td>
            </tr>
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <tr>
              <td colSpan={isWalkUp ? 3 : 2} className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                End total
              </td>
              <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">{total}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
