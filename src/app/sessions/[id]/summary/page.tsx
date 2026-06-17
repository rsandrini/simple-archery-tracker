import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { sessionSummary } from '@/lib/domain/scoring'
import type { SessionData } from '@/lib/domain/types'

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  if (!session) notFound()

  const sessionData: SessionData = {
    id: session.id,
    modality: session.modality as SessionData['modality'],
    targetVariant: session.targetVariant as SessionData['targetVariant'],
    createdAt: session.createdAt.toISOString(),
    ends: session.ends.map(e => ({
      id: e.id,
      index: e.index,
      arrows: e.arrows.map(a => ({
        id: a.id,
        index: a.index,
        score: a.score as SessionData['ends'][0]['arrows'][0]['score'],
        points: a.points,
        isX: a.isX,
        x: a.x,
        y: a.y,
        distance: a.distance,
        spotIndex: a.spotIndex,
      })),
    })),
  }

  const summary = sessionSummary(sessionData)
  const maxTotal = session.modality === 'INDOOR' ? 300 : 140
  const pct = ((summary.total / maxTotal) * 100).toFixed(1)

  const scoreColor: Record<string, string> = {
    X: 'text-yellow-700 font-bold',
    '5': 'text-yellow-600 font-semibold',
    '4': 'text-red-600',
    '3': 'text-red-500',
    '2': 'text-gray-600',
    '1': 'text-gray-500',
    M: 'text-gray-400 italic',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Sessions</Link>
        <span className="text-sm font-medium text-gray-700">
          {session.modality === 'INDOOR' ? 'Indoor Round' : 'Flint Round'} — Summary
        </span>
        <Link href={`/sessions/${id}`} className="text-sm text-blue-600 hover:text-blue-700">
          Continue
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Score summary card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-end justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total score</span>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-gray-900">{summary.total}</span>
            <span className="text-gray-400">/ {maxTotal}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span><span className="font-semibold text-yellow-700">{summary.totalX}</span> × X</span>
            <span><span className="font-semibold">{session.ends.length}</span> ends shot</span>
          </div>
        </div>

        {/* Per-end breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">End breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Arrows</th>
                <th className="px-3 py-2 text-right">End</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.perEnd.map(end => (
                <tr key={end.endIndex} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 font-mono">{end.endIndex + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {end.arrows.map((a, i) => (
                        <span key={i} className={`text-xs ${scoreColor[a.score] ?? ''}`}>
                          {a.score}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{end.endTotal}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">{end.runningTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
