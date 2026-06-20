import { personalRecords } from '@/lib/domain/analytics'
import { ProgressionChart } from './ProgressionChart'
import type { Modality, PREntry } from '@/lib/domain/types'

interface SessionRow {
  id: string
  modality: Modality
  createdAt: string
  total: number
  totalX: number
  bestEnd: number
  meanSpread: number
  consistency: number
}

function PRCard({ label, entry, unit }: { label: string; entry: PREntry | null; unit?: string }) {
  if (!entry) return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-base font-bold text-gray-300 dark:text-gray-600">—</p>
    </div>
  )
  const date = new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {unit === 'radius' ? entry.value.toFixed(1) : entry.value}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
    </div>
  )
}

interface Props {
  sessions: SessionRow[]
}

export async function ProgressSection({ sessions }: Props) {
  if (sessions.length < 3) return null

  const pr = personalRecords(sessions)

  // Consistency: compare latest session vs 5-session rolling average
  const sorted = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latest = sorted[sorted.length - 1]
  const last5 = sorted.slice(-6, -1) // 5 sessions before the latest
  const rollingAvg = last5.length > 0
    ? last5.reduce((s, r) => s + r.consistency, 0) / last5.length
    : latest.consistency
  const diff = latest.consistency - rollingAvg
  const consistencyLabel = diff < -0.5
    ? { text: '↓ Improving', cls: 'text-green-600 dark:text-green-400' }
    : diff > 0.5
    ? { text: '↑ Watch consistency', cls: 'text-orange-500 dark:text-orange-400' }
    : { text: '→ Stable', cls: 'text-gray-500 dark:text-gray-400' }

  return (
    <section className="mb-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Progress</h2>

      <ProgressionChart sessions={sessions} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Personal records</h3>
        <div className="grid grid-cols-2 gap-3">
          <PRCard label="Best Indoor" entry={pr.bestScoreIndoor} />
          <PRCard label="Best Flint" entry={pr.bestScoreFlint} />
          <PRCard label="Best end" entry={pr.bestEnd} />
          <PRCard label="Tightest group" entry={pr.tightestGroup} unit="radius" />
        </div>
        <div className="mt-3">
          <PRCard label="Most Xs in a session" entry={pr.mostX} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Session consistency trend</h3>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{latest.consistency.toFixed(1)} pts std dev</p>
        <p className={`text-sm font-medium mt-0.5 ${consistencyLabel.cls}`}>{consistencyLabel.text}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">vs {last5.length}-session avg ({rollingAvg.toFixed(1)})</p>
      </div>
    </section>
  )
}
