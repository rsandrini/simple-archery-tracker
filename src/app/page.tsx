import Link from 'next/link'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db/prisma'
import { SessionCard } from '@/components/session/SessionCard'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { HomeClient } from './HomeClient'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { APP_VERSION } from '@/lib/version'
import { getProgressionData } from '@/lib/db/session-queries'
import { ProgressSection } from '@/components/analytics/ProgressSection'

const PAGE_SIZE = 5

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const userId = await getAuthenticatedUserId()
  if (!userId) redirect('/login')

  const { page: pageParam, tab: tabParam } = await searchParams
  const tab = tabParam === 'stats' ? 'stats' : 'history'
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [sessions, total, progressionData] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { ends: true } } },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.session.count({ where: { userId } }),
    getProgressionData(userId),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const tabBase = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors'
  const tabActive = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
  const tabInactive = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quiver</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Archery training tracker</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <HomeClient />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-6">
        <Link
          href="/?tab=history"
          className={`flex-1 text-center ${tabBase} ${tab === 'history' ? tabActive : tabInactive}`}
        >
          History
        </Link>
        <Link
          href="/?tab=stats"
          className={`flex-1 text-center ${tabBase} ${tab === 'stats' ? tabActive : tabInactive}`}
        >
          Stats
        </Link>
      </div>

      {tab === 'history' && (
        total === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg mb-1">No sessions yet</p>
            <p className="text-sm">Start a new session to record your training.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {sessions.map(s => (
                <li key={s.id}>
                  <SessionCard
                    id={s.id}
                    modality={s.modality}
                    targetVariant={s.targetVariant}
                    createdAt={s.createdAt.toISOString()}
                    endCount={s._count.ends}
                    rating={s.rating}
                  />
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 text-sm">
                <Link
                  href={hasPrev ? `/?tab=history&page=${page - 1}` : '#'}
                  aria-disabled={!hasPrev}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    hasPrev
                      ? 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'border-transparent text-gray-300 dark:text-gray-600 pointer-events-none'
                  }`}
                >
                  ← Previous
                </Link>

                <span className="text-gray-500 dark:text-gray-400">
                  {page} / {totalPages}
                  <span className="ml-2 text-gray-400 dark:text-gray-500">({total} sessions)</span>
                </span>

                <Link
                  href={hasNext ? `/?tab=history&page=${page + 1}` : '#'}
                  aria-disabled={!hasNext}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    hasNext
                      ? 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'border-transparent text-gray-300 dark:text-gray-600 pointer-events-none'
                  }`}
                >
                  Next →
                </Link>
              </div>
            )}
          </>
        )
      )}

      {tab === 'stats' && (
        progressionData.length < 3 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-lg mb-1">Not enough data yet</p>
            <p className="text-sm">Complete at least 3 sessions to see your stats.</p>
          </div>
        ) : (
          <ProgressSection sessions={progressionData} />
        )
      )}

      <footer className="mt-8 text-center text-xs text-gray-300 dark:text-gray-600">
        {APP_VERSION}
      </footer>
    </main>
  )
}
