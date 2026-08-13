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
  groupTightness: number
}

interface Props {
  sessions: SessionPoint[]
}

export function ProgressionChart({ sessions }: Props) {
  const [metric, setMetric] = useState<'score' | 'groupRadius'>('score')
  const isGroup = metric === 'groupRadius'

  const allPoints = progressionSeries(sessions, metric)
  const indoorPoints = progressionSeries(sessions.filter(s => s.modality === 'INDOOR'), metric)
  const flintPoints = progressionSeries(sessions.filter(s => s.modality === 'FLINT'), metric)

  // Build a unified date index
  const dates = [...new Set(allPoints.map(p => p.date))].sort()
  const data = dates.map(date => {
    const indoor = indoorPoints.find(p => p.date === date)
    const flint = flintPoints.find(p => p.date === date)
    const label = new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
    const scale = isGroup ? 100 : 1
    return {
      date: label,
      indoor: indoor ? indoor.value * scale : undefined,
      flint: flint ? flint.value * scale : undefined,
    }
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-1">
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
      {isGroup && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Lower % = tighter grouping (spread as % of target size)
        </p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => isGroup ? `${Math.round(v)}%` : `${v}`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => {
              const rounded = Math.round(Number(value) * 100) / 100
              return isGroup ? `${rounded}%` : rounded
            }}
          />
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
