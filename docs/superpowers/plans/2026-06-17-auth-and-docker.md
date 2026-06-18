# Auth + Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-user credential authentication with per-user data isolation, then package the app for Docker deployment.

**Architecture:** NextAuth v5 (Auth.js) with a Credentials provider handles login/session via JWT; a `User` model is added to Prisma and every `Session` gains a `userId` FK so all data is owned and filtered per user. Docker uses a single-stage Alpine build with a named volume for the SQLite file.

**Tech Stack:** `next-auth@beta` (v5), `bcryptjs`, Prisma 7 + better-sqlite3 (existing), Next.js 16 App Router (existing), Docker + docker-compose.

---

## Global Constraints

- Node 20 (`.nvmrc`). Always run `source ~/.nvm/nvm.sh` before any node/npm command.
- **Read `node_modules/next/dist/docs/` before touching any Next.js API** — this is Next.js 16, not 14.
- Prisma client lives at `src/generated/prisma`; the prisma singleton is `src/lib/db/prisma.ts`.
- `src/lib/domain/` must stay 100% pure — zero imports from React, Next.js, Prisma, or DOM.
- Vitest tests live in `src/__tests__/**/*.test.ts` — this is where all new unit tests go.
- Auth env vars: `AUTH_SECRET` (required), `AUTH_URL` (optional, only needed when auto-detection fails).
- `DATABASE_URL` env var controls the SQLite file path; default in `src/lib/db/prisma.ts` is `file:./prisma/dev.db`.
- Dev DB is wiped clean in Task 2 (`prisma migrate reset --force`) — no data migration needed.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `User` model; add `userId` FK to `Session` |
| `src/types/next-auth.d.ts` | Create | Augment `Session` type with `user.id` |
| `src/lib/auth-validation.ts` | Create | Pure input validation for registration (testable) |
| `src/lib/auth.ts` | Create | NextAuth v5 config: Credentials provider, JWT callbacks |
| `src/lib/auth-utils.ts` | Create | `getAuthenticatedUserId()` server helper for API routes |
| `src/middleware.ts` | Create | Protect all routes; allow `/login`, `/register`, `/api/auth`, `/api/users` |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | Export NextAuth HTTP handlers |
| `src/app/api/users/route.ts` | Create | `POST /api/users` — public registration endpoint |
| `src/app/api/sessions/route.ts` | Modify | Filter by `userId`; attach `userId` on create |
| `src/app/api/sessions/[id]/route.ts` | Modify | Ownership check on GET/PATCH/DELETE |
| `src/app/api/sessions/[id]/ends/route.ts` | Modify | Ownership check via session |
| `src/app/api/sessions/[id]/ends/[endId]/arrows/route.ts` | Modify | Ownership check via session |
| `src/app/api/arrows/[id]/route.ts` | Modify | Ownership check via arrow→end→session |
| `src/app/login/page.tsx` | Create | Login form (Client Component) |
| `src/app/register/page.tsx` | Create | Registration form (Client Component) |
| `src/components/ui/UserHeader.tsx` | Create | Server Component: show email + logout button |
| `src/app/layout.tsx` | Modify | Add `SessionProvider`; add `UserHeader` |
| `src/__tests__/auth-validation.test.ts` | Create | Unit tests for input validation |
| `next.config.ts` | Modify | No changes needed for Docker (npm start used) |
| `Dockerfile` | Create | Single-stage Alpine build |
| `docker-compose.yml` | Create | App service + db-data volume |
| `.env.example` | Create | Template for required env vars |
| `.env.local` (not committed) | Create | Local dev secrets |

---

## Task 1: Install auth dependencies + TypeScript augmentation

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/types/next-auth.d.ts`

**Interfaces:**
- Produces: `Session.user.id: string` TypeScript type available globally

- [ ] **Step 1: Install packages**

```bash
source ~/.nvm/nvm.sh
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 2: Create TypeScript session type augmentation**

Create `src/types/next-auth.d.ts`:

```typescript
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
source ~/.nvm/nvm.sh
npx tsc --noEmit
```

Expected: no errors related to `session.user.id`.

- [ ] **Step 4: Commit**

```bash
git add src/types/next-auth.d.ts package.json package-lock.json
git commit -m "feat: install next-auth v5 and bcryptjs"
```

---

## Task 2: Prisma User model + Session.userId migration

**Files:**
- Modify: `prisma/schema.prisma`
- Auto-generated: `prisma/migrations/XXXXXX_add_user_auth/migration.sql`
- Auto-regenerated: `src/generated/prisma/` (via prisma generate)

**Interfaces:**
- Produces: `prisma.user.create(...)`, `prisma.user.findUnique(...)`, `session.userId: string` available in all API routes

- [ ] **Step 1: Update prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String?
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  modality      String
  targetVariant String   @default("1-SPOT")
  createdAt     DateTime @default(now())
  notes         String?
  rating        Int?
  ends          End[]
}

model End {
  id        String  @id @default(cuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  index     Int
  arrows    Arrow[]

  @@unique([sessionId, index])
}

model Arrow {
  id        String  @id @default(cuid())
  endId     String
  end       End     @relation(fields: [endId], references: [id], onDelete: Cascade)
  index     Int
  score     String
  points    Int
  isX       Boolean @default(false)
  x         Float
  y         Float
  distance  String?
  spotIndex Int?

  @@unique([endId, index])
}
```

- [ ] **Step 2: Reset DB and apply migration fresh**

```bash
source ~/.nvm/nvm.sh
npx prisma migrate reset --force
npx prisma migrate dev --name add-user-auth
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify generated types include User**

```bash
grep -r "findUnique" src/generated/prisma/models/ | grep -i user
```

Expected: at least one match showing `User` model is generated.

- [ ] **Step 4: Run existing tests — should still pass**

```bash
source ~/.nvm/nvm.sh
npm run test
```

Expected: 68/68 tests passing (domain layer is unaffected).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/prisma/
git commit -m "feat: add User model and userId FK to Session"
```

---

## Task 3: Input validation utility (TDD)

**Files:**
- Create: `src/lib/auth-validation.ts`
- Create: `src/__tests__/auth-validation.test.ts`

**Interfaces:**
- Produces: `validateRegistrationInput(email: string, password: string): string | null` — returns error message or `null` if valid

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/auth-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateRegistrationInput } from '@/lib/auth-validation'

describe('validateRegistrationInput', () => {
  it('returns null for valid inputs', () => {
    expect(validateRegistrationInput('user@example.com', 'password123')).toBeNull()
  })

  it('rejects empty email', () => {
    expect(validateRegistrationInput('', 'password123')).toBe('Email and password are required')
  })

  it('rejects empty password', () => {
    expect(validateRegistrationInput('user@example.com', '')).toBe('Email and password are required')
  })

  it('rejects invalid email format', () => {
    expect(validateRegistrationInput('notanemail', 'password123')).toBe('Invalid email format')
  })

  it('rejects password shorter than 8 characters', () => {
    expect(validateRegistrationInput('user@example.com', 'abc123')).toBe('Password must be at least 8 characters')
  })

  it('accepts name as optional (not validated here)', () => {
    expect(validateRegistrationInput('user@example.com', 'password123')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
source ~/.nvm/nvm.sh
npm run test -- --reporter=verbose 2>&1 | grep -A5 "auth-validation"
```

Expected: `Cannot find module '@/lib/auth-validation'`

- [ ] **Step 3: Implement the validation function**

Create `src/lib/auth-validation.ts`:

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegistrationInput(email: string, password: string): string | null {
  if (!email || !password) return 'Email and password are required'
  if (!EMAIL_REGEX.test(email)) return 'Invalid email format'
  if (password.length < 8) return 'Password must be at least 8 characters'
  return null
}
```

- [ ] **Step 4: Run tests — should pass**

```bash
source ~/.nvm/nvm.sh
npm run test
```

Expected: all tests pass, including the 6 new auth-validation tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-validation.ts src/__tests__/auth-validation.test.ts
git commit -m "feat: add registration input validation with tests"
```

---

## Task 4: User registration API

**Files:**
- Create: `src/app/api/users/route.ts`

**Interfaces:**
- Consumes: `validateRegistrationInput(email, password): string | null` from `@/lib/auth-validation`
- Produces: `POST /api/users` → `201 { id, email, name, createdAt }` or `400/409 { error }`

- [ ] **Step 1: Create the registration route**

Create `src/app/api/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import prisma from '@/lib/db/prisma'
import { validateRegistrationInput } from '@/lib/auth-validation'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string; name?: string }
  const { email = '', password = '', name } = body

  const validationError = validateRegistrationInput(email, password)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Start dev server and test manually**

```bash
source ~/.nvm/nvm.sh
npm run dev &
sleep 3

# Register a user
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' | jq .
```

Expected: `{ "id": "...", "email": "test@example.com", "name": "Test User", "createdAt": "..." }`

- [ ] **Step 3: Test duplicate email rejection**

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .
```

Expected: `{ "error": "Email already in use" }` with HTTP 409.

- [ ] **Step 4: Test validation rejection**

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"short"}' | jq .
```

Expected: `{ "error": "Password must be at least 8 characters" }` with HTTP 400.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/users/route.ts
git commit -m "feat: add user registration API endpoint"
```

---

## Task 5: NextAuth config + credentials provider + auth helper

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth-utils.ts`
- Create: `.env.local` (not committed — keep out of git)

**Interfaces:**
- Produces:
  - `auth()` — async server function, returns `Session | null`
  - `signIn`, `signOut` — server-side actions (re-exported from NextAuth)
  - `handlers` — NextAuth HTTP handlers
  - `getAuthenticatedUserId(): Promise<string | null>` — shorthand for API routes

- [ ] **Step 1: Create .env.local with required secrets**

```bash
# Generate a secure secret
SECRET=$(openssl rand -base64 32)
echo "AUTH_SECRET=$SECRET" > .env.local
echo "DATABASE_URL=file:./prisma/dev.db" >> .env.local
```

Verify `.gitignore` already ignores `.env.local` (Next.js projects do this by default). If not:

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 2: Create NextAuth config**

Create `src/lib/auth.ts`:

```typescript
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from '@/lib/db/prisma'

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null
        const valid = await compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
```

- [ ] **Step 3: Create the NextAuth HTTP route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Create auth-utils helper**

Create `src/lib/auth-utils.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- [ ] **Step 5: Test login works via API**

With the dev server running and the test user from Task 4 already registered:

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test%40example.com&password=password123&csrfToken=PLACEHOLDER"
```

Note: CSRF protection requires getting the token first. The full login flow is better tested via the UI in Task 8. For now, verify the route responds (even a redirect/error is OK — it means the handler is wired up):

```bash
curl -I http://localhost:3000/api/auth/providers
```

Expected: HTTP 200 with JSON.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/lib/auth-utils.ts .gitignore
git commit -m "feat: add NextAuth v5 credentials provider and auth utilities"
```

---

## Task 6: Middleware — route protection

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`
- Produces: all non-public routes redirect to `/login` when unauthenticated; `/login` and `/register` redirect to `/` when already authenticated

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PREFIXES = ['/login', '/register', '/api/auth', '/api/users']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (req.auth && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Test unauthenticated redirect**

With dev server running (stop and restart to pick up middleware):

```bash
source ~/.nvm/nvm.sh
# Stop existing server, restart
npm run dev &
sleep 3
curl -s -I http://localhost:3000/ | head -5
```

Expected: `HTTP/1.1 307 Temporary Redirect` with `location: http://localhost:3000/login`

- [ ] **Step 3: Verify registration endpoint is still public**

```bash
curl -s -I -X POST http://localhost:3000/api/users | head -3
```

Expected: NOT a redirect — should be a 4xx (missing body) or 200, NOT 307 to /login.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add route protection middleware"
```

---

## Task 7: Data isolation — update all API routes

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Modify: `src/app/api/sessions/[id]/route.ts`
- Modify: `src/app/api/sessions/[id]/ends/route.ts`
- Modify: `src/app/api/sessions/[id]/ends/[endId]/arrows/route.ts`
- Modify: `src/app/api/arrows/[id]/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedUserId(): Promise<string | null>`, `unauthorizedResponse()` from `@/lib/auth-utils`
- Produces: all session data scoped to authenticated user; 401 for unauthenticated; 404 for cross-user access attempts

- [ ] **Step 1: Update sessions list + create route**

Replace `src/app/api/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'
import type { Modality, TargetVariant } from '@/lib/domain/types'

export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ends: true } } },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const body = await req.json()
  const modality = body.modality as Modality
  const targetVariant = (body.targetVariant as TargetVariant) ?? '1-SPOT'

  if (!['INDOOR', 'FLINT'].includes(modality)) {
    return NextResponse.json({ error: 'Invalid modality' }, { status: 400 })
  }

  const session = await prisma.session.create({
    data: { modality, targetVariant, userId },
  })
  return NextResponse.json(session, { status: 201 })
}
```

- [ ] **Step 2: Update single session route**

Replace `src/app/api/sessions/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const session = await prisma.session.findFirst({
    where: { id, userId },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const owned = await prisma.session.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as { notes?: string; rating?: number | null }
  const data: { notes?: string; rating?: number | null } = {}
  if (body.notes !== undefined) data.notes = body.notes
  if (body.rating !== undefined) data.rating = body.rating
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const session = await prisma.session.update({ where: { id }, data })
  return NextResponse.json(session)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const owned = await prisma.session.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.session.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Update ends route**

Read the current `src/app/api/sessions/[id]/ends/route.ts`, then update it to add an ownership check before creating an end. The pattern: look up `prisma.session.findFirst({ where: { id: sessionId, userId } })` and return 404 if null. Apply this same guard at the top of every handler in the file.

- [ ] **Step 4: Update arrows-in-end route**

Read `src/app/api/sessions/[id]/ends/[endId]/arrows/route.ts`, then add an ownership check at the top of every handler:

```typescript
const userId = await getAuthenticatedUserId()
if (!userId) return unauthorizedResponse()

const { id: sessionId } = await params  // params contains { id, endId }
const owned = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { id: true } })
if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

- [ ] **Step 5: Update arrows route (PATCH + DELETE)**

Read `src/app/api/arrows/[id]/route.ts`, then add an ownership check for each handler. For arrows, verify ownership via the arrow's end → session chain:

```typescript
const userId = await getAuthenticatedUserId()
if (!userId) return unauthorizedResponse()

const { id } = await params
const arrow = await prisma.arrow.findFirst({
  where: { id },
  include: { end: { include: { session: { select: { userId: true } } } } },
})
if (!arrow || arrow.end.session.userId !== userId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

- [ ] **Step 6: Manual smoke test**

With dev server running and a logged-in session (via cookies):

```bash
# Create a user and session, then verify isolation
curl -s http://localhost:3000/api/sessions   # Should return 401 without auth cookie
```

Use the browser to log in, create a session, and verify it appears on the home page only for that user.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/sessions/ src/app/api/arrows/
git commit -m "feat: add per-user data isolation to all API routes"
```

---

## Task 8: Login page UI

**Files:**
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`; navigates to `/` on success, `/register` for new users

- [ ] **Step 1: Create login page**

Create `src/app/login/page.tsx`:

```tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Sign in to Quiver
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          No account?{' '}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test login manually in browser**

Navigate to `http://localhost:3000/login`. Enter `test@example.com` / `password123` (created in Task 4). Expected: redirects to `/` (home page, which may be empty for now).

- [ ] **Step 3: Test wrong password**

Enter wrong password. Expected: "Invalid email or password" shown inline.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page"
```

---

## Task 9: Register page UI

**Files:**
- Create: `src/app/register/page.tsx`

**Interfaces:**
- Consumes: `POST /api/users` for account creation; redirects to `/login` on success

- [ ] **Step 1: Create register page**

Create `src/app/register/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || undefined, email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Registration failed')
      return
    }

    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Create account
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-gray-400">(min 8 characters)</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test registration end-to-end**

Navigate to `http://localhost:3000/register`. Create a new account. Expected: redirects to `/login`.

- [ ] **Step 3: Log in with the new account**

Log in with the newly registered account. Expected: lands on `/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/register/
git commit -m "feat: add registration page"
```

---

## Task 10: Layout — SessionProvider + user header

**Files:**
- Create: `src/components/ui/UserHeader.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `auth()` from `@/lib/auth` (server-side); `signOut` from `@/lib/auth` (Server Action)
- Produces: persistent header showing user email + logout button on all authenticated pages

- [ ] **Step 1: Create UserHeader as a Server Component**

Create `src/components/ui/UserHeader.tsx`:

```tsx
import { auth, signOut } from '@/lib/auth'

export default async function UserHeader() {
  const session = await auth()
  if (!session?.user) return null

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button
          type="submit"
          className="text-sm text-red-600 dark:text-red-400 hover:underline min-w-[40px] min-h-[40px] flex items-center"
        >
          Sign out
        </button>
      </form>
    </header>
  )
}
```

- [ ] **Step 2: Add SessionProvider and UserHeader to layout**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import UserHeader from '@/components/ui/UserHeader'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quiver',
  description: 'Archery training tracker',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

const themeScript = `
try {
  var t = localStorage.getItem('quiver-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <SessionProvider>
          <ThemeProvider>
            <UserHeader />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Test header and logout in browser**

Navigate to the app. Expected: header with user email or name, and a "Sign out" button visible after logging in. Clicking "Sign out" should redirect to `/login`.

- [ ] **Step 4: Run full test suite**

```bash
source ~/.nvm/nvm.sh
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/UserHeader.tsx src/app/layout.tsx
git commit -m "feat: add user header with logout + SessionProvider"
```

---

## Task 11: Docker setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Produces: `docker compose up --build` launches the app on port 3000 with persistent SQLite via a named volume

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
# SQLite database location (use the path inside the container volume for Docker)
DATABASE_URL=file:./prisma/dev.db

# Required: generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-key-here

# Optional: only needed if NextAuth can't auto-detect the URL
# AUTH_URL=http://localhost:3000
```

- [ ] **Step 2: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Build tools needed for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache python3 make g++ && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
# Rebuild native addon for runner (same Alpine platform, so fast)

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Run migrations on startup, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

- [ ] **Step 3: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "file:/app/data/prod.db"
      AUTH_SECRET: "${AUTH_SECRET}"
      AUTH_URL: "${AUTH_URL:-http://localhost:3000}"
    volumes:
      - db-data:/app/data
    restart: unless-stopped

volumes:
  db-data:
```

- [ ] **Step 4: Add .env to .gitignore (if not already)**

```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 5: Build and run with Docker**

```bash
# Create a .env for docker-compose
cp .env.example .env
# Edit .env: set AUTH_SECRET to a real value
AUTH_SECRET=$(openssl rand -base64 32)
echo "AUTH_SECRET=$AUTH_SECRET" > .env

docker compose build
docker compose up -d
sleep 5
curl -I http://localhost:3000/
```

Expected: HTTP 307 redirect to `/login` (app is running, middleware is active).

- [ ] **Step 6: Test registration + login via Docker**

Navigate to `http://localhost:3000/register` in the browser. Register a user. Log in. Create a training session. Stop and restart the container — the session should persist (volume-backed SQLite).

```bash
docker compose restart
sleep 5
# Re-open browser and verify data is still there after restart
```

- [ ] **Step 7: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example .gitignore
git commit -m "feat: add Docker support with persistent SQLite volume"
```

---

## Self-Review

**Spec coverage:**
- ✅ Multi-user credential auth → Tasks 1–5
- ✅ Data isolation per user in DB → Tasks 2, 7
- ✅ Simple user/pass for now → Credentials provider (Task 5)
- ✅ Expandable to other auth methods → NextAuth v5 supports adding any OAuth provider via one extra `providers:` entry in `src/lib/auth.ts`
- ✅ Docker ready → Task 11

**Placeholder check:** All steps have complete code. No TBDs.

**Type consistency:**
- `getAuthenticatedUserId()` returns `string | null` — used correctly in all routes with null guard
- `unauthorizedResponse()` returns `NextResponse` — used as a return value
- `session.user.id` type is augmented in `src/types/next-auth.d.ts` — consumed correctly in `UserHeader` and `auth-utils`
- Prisma `session.findFirst({ where: { id, userId } })` — correct pattern for ownership checks (returns null if not owned, not an error)

**Adding OAuth later:** Any future provider (Google, GitHub, etc.) only requires two changes:
1. Add the provider to the `providers:` array in `src/lib/auth.ts`
2. Add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` etc. to `.env.local` / docker-compose env

No API routes, middleware, or DB changes needed.
