'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { progressionSeries } from '@/lib/domain/analytics'
import type { Modality } from '@/lib/domain/types'

interface SessionPoint {
  id: string
  modality: Modality
  createdAt: string
  total: number
  meanSpread: number
}

interface Props {
  sessions: SessionPoint[]
}

export function ProgressionChart({ sessions }: Props) {
  const [metric, setMetric] = useState<'score' | 'groupRadius'>('score')

  const allPoints = progressionSeries(sessions, metric)
  const indoorPoints = progressionSeries(sessions.filter(s => s.modality === 'INDOOR'), metric)
  const flintPoints = progressionSeries(sessions.filter(s => s.modality === 'FLINT'), metric)

  // Build a unified date index
  const dates = [...new Set(allPoints.map(p => p.date))].sort()
  const data = dates.map(date => {
    const indoor = indoorPoints.find(p => p.date === date)
    const flint = flintPoints.find(p => p.date === date)
    const label = new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
    return { date: label, indoor: indoor?.value, flint: flint?.value }
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Progression</h3>
        <div className="flex gap-1">
          {(['score', 'groupRadius'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                metric === m
                  ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              {m === 'score' ? 'Score' : 'Group'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone" dataKey="indoor" name="Indoor"
            stroke="#3b82f6" strokeWidth={2}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            type="monotone" dataKey="flint" name="Flint"
            stroke="#f97316" strokeWidth={2}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
