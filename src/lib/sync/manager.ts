import db from '@/lib/db/local'

let running = false

const MAX_RETRIES = 5

/**
 * Parse a mutation URL + body to determine which entity table and ID are
 * affected. Returns null if the URL doesn't match a known pattern.
 */
function parseEntityRef(
  url: string,
  body: string | null
): { table: 'sessions' | 'ends' | 'arrows'; id: string } | null {
  const parsed = new URL(url, 'https://placeholder')
  const pathname = parsed.pathname

  // POST /api/sessions — body contains { id }
  if (/^\/api\/sessions$/.test(pathname)) {
    const id = body ? (JSON.parse(body) as { id?: string }).id : undefined
    if (id) return { table: 'sessions', id }
    return null
  }

  // POST /api/sessions/[sid]/ends — body contains { id }
  const endsMatch = pathname.match(/^\/api\/sessions\/[^/]+\/ends$/)
  if (endsMatch) {
    const id = body ? (JSON.parse(body) as { id?: string }).id : undefined
    if (id) return { table: 'ends', id }
    return null
  }

  // POST /api/sessions/[sid]/ends/[eid]/arrows — body contains { id }
  const arrowsMatch = pathname.match(/^\/api\/sessions\/[^/]+\/ends\/[^/]+\/arrows$/)
  if (arrowsMatch) {
    const id = body ? (JSON.parse(body) as { id?: string }).id : undefined
    if (id) return { table: 'arrows', id }
    return null
  }

  // PATCH /api/arrows/[id]
  const patchArrowMatch = pathname.match(/^\/api\/arrows\/([^/]+)$/)
  if (patchArrowMatch) {
    return { table: 'arrows', id: patchArrowMatch[1] }
  }

  return null
}

/** Mark an entity as synced in its table. */
async function markSynced(
  table: 'sessions' | 'ends' | 'arrows',
  id: string
): Promise<void> {
  await db[table].update(id, { _syncStatus: 'synced' })
}

/** Delete an entity from its table (used on 422 — invalid data, drop locally). */
async function deleteEntity(
  table: 'sessions' | 'ends' | 'arrows',
  id: string
): Promise<void> {
  await db[table].delete(id)
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (running) return { synced: 0, failed: 0 }
  running = true
  let synced = 0
  let failed = 0

  try {
    const mutations = await db.mutations.orderBy('createdAt').toArray()

    for (const mutation of mutations) {
      // I1: Skip (and discard) mutations that have exceeded the retry cap to
      // prevent head-of-line blocking.
      if (mutation.retries >= MAX_RETRIES) {
        console.warn(
          `[sync] Dropping mutation ${mutation.id} (${mutation.method} ${mutation.url}) — exceeded MAX_RETRIES (${MAX_RETRIES})`
        )
        await db.mutations.delete(mutation.id!)
        failed++
        continue
      }

      try {
        const res = await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.body ? { 'Content-Type': 'application/json' } : {},
          body: mutation.body ?? undefined,
        })

        if (res.ok || res.status === 404) {
          // 404 = already deleted on server; treat as success.
          // I4: Mark the entity as synced now that the server has it.
          if (res.ok) {
            const ref = parseEntityRef(mutation.url, mutation.body)
            if (ref) {
              await markSynced(ref.table, ref.id)
            }
          }
          await db.mutations.delete(mutation.id!)
          synced++
        } else if (res.status === 409) {
          // C3 (409): Resource already exists on the server — it was created
          // successfully on a prior attempt. Mark the local entity as synced.
          const ref = parseEntityRef(mutation.url, mutation.body)
          if (ref && mutation.method !== 'DELETE') {
            await markSynced(ref.table, ref.id)
          }
          await db.mutations.delete(mutation.id!)
          failed++
        } else if (res.status === 422) {
          // C3 (422): Data was invalid — the server will never accept this.
          // Delete the local entity to avoid silent phantom data, then drop
          // the queue entry.
          const ref = parseEntityRef(mutation.url, mutation.body)
          if (ref) {
            await deleteEntity(ref.table, ref.id)
          }
          await db.mutations.delete(mutation.id!)
          failed++
        } else {
          // Transient error (5xx, etc.) — increment retry count; stop
          // processing to avoid hammering a struggling server.
          await db.mutations.update(mutation.id!, { retries: mutation.retries + 1 })
          break
        }
      } catch {
        // Network error mid-flush — stop, will retry next time online.
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

// ─── Reactive retry scheduler ────────────────────────────────────────────
//
// A save can fail while the browser still thinks it's online (flaky signal,
// server hiccup) — that mutation gets queued but nothing else would ever
// retry it until the user reloads or toggles connectivity. scheduleFlush()
// gives the queue its own retry loop: fires (almost) immediately, then backs
// off exponentially while attempts keep failing, and resets to the fast
// retry the moment new work shows up or an attempt makes progress.

const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 20000

type PendingListener = (pending: number) => void
type SyncingListener = (syncing: boolean) => void

const pendingListeners = new Set<PendingListener>()
const syncingListeners = new Set<SyncingListener>()

let retryDelay = RETRY_BASE_MS
let retryTimer: ReturnType<typeof setTimeout> | null = null
let attemptInFlight = false

export function onPendingChange(cb: PendingListener): () => void {
  pendingListeners.add(cb)
  return () => pendingListeners.delete(cb)
}

export function onSyncingChange(cb: SyncingListener): () => void {
  syncingListeners.add(cb)
  return () => syncingListeners.delete(cb)
}

async function emitPending() {
  const count = await pendingCount()
  pendingListeners.forEach(l => l(count))
}

function emitSyncing(syncing: boolean) {
  syncingListeners.forEach(l => l(syncing))
}

/** Trigger (or fast-track) a retry pass over the queue. Safe to call often — idempotent while an attempt is already in flight. */
export function scheduleFlush(): void {
  retryDelay = RETRY_BASE_MS
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  void emitPending()
  if (attemptInFlight) return
  void runRetryLoop()
}

async function runRetryLoop(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const before = await pendingCount()
  if (before === 0) return

  attemptInFlight = true
  emitSyncing(true)
  const { synced } = await flushQueue()
  emitSyncing(false)
  attemptInFlight = false
  await emitPending()

  const after = await pendingCount()
  if (after === 0) return

  retryDelay = synced > 0 ? RETRY_BASE_MS : Math.min(retryDelay * 2, RETRY_MAX_MS)
  retryTimer = setTimeout(() => {
    retryTimer = null
    void runRetryLoop()
  }, retryDelay)
}
