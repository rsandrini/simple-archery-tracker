import { getTranslations } from 'next-intl/server'
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
  groupTightness: number
  consistency: number
}

async function PRCard({ label, entry, unit, locale }: { label: string; entry: PREntry | null; unit?: string; locale: string }) {
  if (!entry) return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-base font-bold text-gray-300 dark:text-gray-600">—</p>
    </div>
  )
  const date = new Date(entry.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {unit === 'percent' ? `${(entry.value * 100).toFixed(1)}%` : entry.value}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date}</p>
    </div>
  )
}

interface Props {
  sessions: SessionRow[]
  locale: string
}

export async function ProgressSection({ sessions, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'ProgressSection' })
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
    ? { text: t('improving'), cls: 'text-green-600 dark:text-green-400' }
    : diff > 0.5
    ? { text: t('watchConsistency'), cls: 'text-orange-500 dark:text-orange-400' }
    : { text: t('stable'), cls: 'text-gray-500 dark:text-gray-400' }

  return (
    <section className="mb-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('progress')}</h2>

      <ProgressionChart sessions={sessions} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('personalRecords')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <PRCard label={t('bestIndoor')} entry={pr.bestScoreIndoor} locale={locale} />
          <PRCard label={t('bestFlint')} entry={pr.bestScoreFlint} locale={locale} />
          <PRCard label={t('bestEnd')} entry={pr.bestEnd} locale={locale} />
          <PRCard label={t('tightestGroup')} entry={pr.tightestGroup} unit="percent" locale={locale} />
        </div>
        <div className="mt-3">
          <PRCard label={t('mostX')} entry={pr.mostX} locale={locale} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('consistencyTitle')}</h3>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('ptsStdDev', { value: latest.consistency.toFixed(1) })}</p>
        <p className={`text-sm font-medium mt-0.5 ${consistencyLabel.cls}`}>{consistencyLabel.text}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('vsAvg', { count: last5.length, avg: rollingAvg.toFixed(1) })}</p>
      </div>
    </section>
  )
}
