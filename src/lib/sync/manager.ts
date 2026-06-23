import db from '@/lib/db/local'

let running = false

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (running) return { synced: 0, failed: 0 }
  running = true
  let synced = 0
  let failed = 0

  try {
    const mutations = await db.mutations.orderBy('createdAt').toArray()

    for (const mutation of mutations) {
      try {
        const res = await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.body ? { 'Content-Type': 'application/json' } : {},
          body: mutation.body ?? undefined,
        })

        if (res.ok || res.status === 404) {
          // 404 = already deleted on server; treat as success
          await db.mutations.delete(mutation.id!)
          synced++
        } else if (res.status === 409 || res.status === 422) {
          // Conflict or validation error — drop the mutation, server wins
          await db.mutations.delete(mutation.id!)
          failed++
        } else {
          // Transient error — increment retry count; stop processing
          await db.mutations.update(mutation.id!, { retries: mutation.retries + 1 })
          break
        }
      } catch {
        // Network error mid-flush — stop, will retry next time online
        break
      }
    }
  } finally {
    running = false
  }

  return { synced, failed }
}

export function pendingCount(): Promise<number> {
  return db.mutations.count()
}
