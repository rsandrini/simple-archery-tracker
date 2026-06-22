# Quiver — Roadmap

_Last updated: 2026-06-22_

---

## Done

- Core scoring engine — Indoor and Flint rounds, double-hit rule, undo
- SVG target with zoom overlay and live score inference
- Session summary — shot chart, fatigue curve, score histogram, clock map, pattern hints, outlier detection
- Cross-session progression on home page
- Auth — email/password, forgot password, rate limiting, security headers
- Docker + Cloudflare Tunnel deployment
- Analytics tab — avg pts per arrow, X rate, miss rate, dispersion ellipse, centroid bias

---

## Near-term

### Export data
- Download session as CSV (ends + arrows + scores)
- Download full account data as ZIP (all sessions)

### Personal records
- Best total score, best single end, tightest group, most Xs — per modality
- Highlight in session summary when a record is beaten
- Records page or section on home page

---

## Medium-term

### Offline-first (PWA)
**Goal:** The app works with no internet connection. Data is never lost.

- PWA manifest + service worker — installable on iOS/Android home screen
- IndexedDB local store (Dexie.js) mirrors the server schema
- Optimistic writes — every action writes locally first, then syncs to server
- Sync queue — pending mutations are retried automatically when connection is restored
- Conflict resolution — last-write-wins per arrow; server is source of truth on merge
- Offline indicator in UI (subtle banner when offline, sync status when reconnecting)

### Guest mode (no account required)
**Goal:** A new user can open the app and start shooting immediately, no sign-up friction.

- Skip auth entirely — app works with IndexedDB as the only store
- All session/end/arrow data lives locally in the browser
- If the user later creates an account, a migration flow uploads local data to the server
- Deduplication on migration — avoid double-counting if any sessions overlap
- Option to clear local data after successful sync
- Guest data persists across browser sessions (IndexedDB, not sessionStorage)

> **Note:** Offline-first and guest mode share the same IndexedDB layer. Build offline-first first — guest mode is then a thin layer on top (skip the auth check, point all reads/writes at local DB only).

---

## Long-term

### Multi-language (i18n)
- `next-intl` for Next.js 15 App Router
- Start with EN + PT-BR

### Google OAuth
- NextAuth provider addition — one-tap sign in
- Link existing email/password account to Google

### Postgres migration
- Swap `better-sqlite3` for a Postgres adapter
- Re-run migrations; ~half day of work
- Needed when running multiple server instances or needing managed backups

---

## Non-goals (for now)

- Pattern hypotheses are always suggestions — never diagnosis
- No mixing of modalities in temporal series
- No real-time multiplayer / shared sessions
- No video or form analysis
