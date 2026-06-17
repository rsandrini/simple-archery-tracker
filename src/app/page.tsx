import prisma from '@/lib/db/prisma'
import { SessionCard } from '@/components/session/SessionCard'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { HomeClient } from './HomeClient'

export default async function HomePage() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ends: true } } },
  })

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

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-1">No sessions yet</p>
          <p className="text-sm">Start a new session to record your training.</p>
        </div>
      ) : (
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
      )}
    </main>
  )
}
