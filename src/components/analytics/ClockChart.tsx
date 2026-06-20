'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { ClockSector } from '@/lib/domain/types'

const SECTOR_ORDER: ClockSector[] = ['12h', '1-2h', '3h', '4-5h', '6h', '7-8h', '9h', '10-11h']

interface Props {
  distribution: Record<ClockSector, number>
}

export function ClockChart({ distribution }: Props) {
  const data = SECTOR_ORDER.map(s => ({ sector: s, count: distribution[s] }))
  const centerCount = distribution['center']
  const total = Object.values(distribution).reduce((s, n) => s + n, 0)
  if (total === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Clock distribution</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Where arrows land on the clock face</p>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid />
          <PolarAngleAxis dataKey="sector" tick={{ fontSize: 11 }} />
          <Radar
            name="Arrows"
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [v, 'arrows']}
          />
        </RadarChart>
      </ResponsiveContainer>
      {centerCount > 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
          <span className="font-semibold text-green-600 dark:text-green-400">{centerCount}</span> arrow{centerCount !== 1 ? 's' : ''} in center
        </p>
      )}
    </div>
  )
}
