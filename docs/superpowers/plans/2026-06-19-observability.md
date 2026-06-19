# Observability: Sentry + Pino Implementation Plan

**Goal:** Add structured logging (Pino) and error/performance tracking (Sentry) to Quiver.

**Architecture:**
- Pino replaces all `console.warn`/`console.log` in the auth and API layer with structured JSON, readable in Docker logs.
- Sentry catches unhandled client and server errors, tracks slow API routes, and sends alerts to your existing account.

**Tech Stack:** `@sentry/nextjs` v8, `pino`, `pino-pretty` (dev only)

## Prerequisites

- Sentry account already exists — get the DSN from your Sentry project → Settings → Client Keys (DSN)
- Add to your server `.env`: `SENTRY_DSN=https://...@sentry.io/...`
- Optional (source maps upload): `SENTRY_AUTH_TOKEN=...` (from Sentry → Settings → Auth Tokens)

## Global Constraints

- Next.js 15 App Router — use `instrumentation.ts` for server-side Sentry init (not `_app.tsx`)
- Pino logger must be a singleton exported from `src/lib/logger.ts`
- No `console.log`/`console.warn` left in auth or API layer after Task 3
- `pino-pretty` only installed as devDependency; production outputs raw JSON
- `SENTRY_DSN` must be added to `docker-compose.yml` environment block

---

### Task 1: Install packages and create the Pino logger

**Files:**
- Create: `src/lib/logger.ts`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
npm install pino @sentry/nextjs
npm install --save-dev pino-pretty
```

- [ ] **Step 2: Verify install**

```bash
npm ls pino @sentry/nextjs pino-pretty
```

Expected: all three listed without errors.

- [ ] **Step 3: Create the Pino logger singleton**

Create `src/lib/logger.ts`:

```ts
import pino from 'pino'

const logger = pino(
  process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}
)

export default logger
```

- [ ] **Step 4: Verify the logger compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/logger.ts package.json package-lock.json
git commit -m "feat: add pino logger singleton and install sentry/nextjs"
```

---

### Task 2: Configure Sentry for Next.js 15

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `instrumentation.ts`
- Modify: `next.config.ts`
- Modify: `docker-compose.yml`
- Modify: `.env.example` (if it exists)

- [ ] **Step 1: Create `sentry.client.config.ts`** (browser error tracking + session replay)

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [Sentry.replayIntegration()],
})
```

- [ ] **Step 2: Create `sentry.server.config.ts`** (server errors + slow routes)

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
})
```

- [ ] **Step 3: Create `sentry.edge.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
})
```

- [ ] **Step 4: Create `instrumentation.ts`** at project root (Next.js 15 hook)

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string },
  context: { routeType: string }
) => {
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(err, request, context)
}
```

- [ ] **Step 5: Wrap `next.config.ts` with `withSentryConfig`**

Read the current `next.config.ts` first. The file currently exports `nextConfig`. Wrap it:

```ts
import * as Sentry from '@sentry/nextjs'

// ... existing nextConfig object stays the same ...

export default Sentry.withSentryConfig(nextConfig, {
  org: 'your-sentry-org-slug',       // from Sentry dashboard URL
  project: 'your-sentry-project-slug',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
```

> Note: `org` and `project` slugs appear in your Sentry project URL: `sentry.io/organizations/<org>/projects/<project>/`

- [ ] **Step 6: Add env vars to `docker-compose.yml`**

In the `app` service `environment` block, add:

```yaml
SENTRY_DSN: "${SENTRY_DSN}"
NEXT_PUBLIC_SENTRY_DSN: "${SENTRY_DSN}"
```

- [ ] **Step 7: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts next.config.ts docker-compose.yml
git commit -m "feat: wire up Sentry for client, server, and edge runtimes"
```

---

### Task 3: Replace console.warn/log with Pino in auth and API layer

**Files to modify:**
- `src/lib/auth.ts` — has `console.warn` on failed login
- `src/app/api/auth/forgot-password/route.ts` — has rate-limit log
- Any other API route using `console.*`

- [ ] **Step 1: Find all console usage in the API/auth layer**

```bash
grep -rn "console\." src/lib/auth.ts src/app/api/
```

Note every occurrence — you'll replace each one.

- [ ] **Step 2: Replace in `src/lib/auth.ts`**

Add at top:
```ts
import logger from '@/lib/logger'
```

Replace the failed-login `console.warn`:
```ts
// Before:
console.warn('Failed login attempt for unknown email:', credentials.email)
// After:
logger.warn({ email: credentials.email }, 'Failed login attempt: unknown email')
```

```ts
// Before:
console.warn('Failed login attempt: wrong password for', credentials.email)
// After:
logger.warn({ email: credentials.email }, 'Failed login attempt: wrong password')
```

- [ ] **Step 3: Replace in `src/app/api/auth/forgot-password/route.ts`**

Add at top:
```ts
import logger from '@/lib/logger'
```

Replace any `console.warn` for rate limiting:
```ts
// Before:
console.warn('Rate limit hit for:', email)
// After:
logger.warn({ email }, 'Password reset rate limit hit')
```

- [ ] **Step 4: Verify no console.* remains in auth/API layer**

```bash
grep -rn "console\." src/lib/auth.ts src/app/api/
```

Expected: no output.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/
git commit -m "feat: replace console.warn with pino structured logging in auth and API layer"
```

---

### Task 4: Smoke test the full setup locally

- [ ] **Step 1: Add SENTRY_DSN to your local `.env`**

```
SENTRY_DSN=https://your-key@sentry.io/your-project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

- [ ] **Step 2: Run dev server and check Pino output**

```bash
npm run dev
```

Make a failed login attempt. You should see structured JSON (or pretty-printed in dev) in the terminal, not a plain `console.warn`.

- [ ] **Step 3: Verify Sentry receives an event**

Trigger an error (or use Sentry's test button in the dashboard). Confirm it appears in your Sentry project under Issues.

- [ ] **Step 4: Build for production (catches Sentry config issues)**

```bash
npm run build
```

Expected: builds without errors. Sentry may log source map upload info — that's normal.

- [ ] **Step 5: Commit any fixes, then tag**

```bash
git add -A
git commit -m "chore: verify observability stack (sentry + pino) working end-to-end"
```

---

## Deploy Checklist

On your server, before `docker compose up`:

```bash
# Add to your .env on the server
echo 'SENTRY_DSN=https://your-key@sentry.io/your-project-id' >> .env
```

Then rebuild and restart:

```bash
docker compose build
docker compose up -d
```

Pino logs appear in `docker compose logs -f app` as JSON.
Sentry catches unhandled errors automatically — no extra wiring needed.
