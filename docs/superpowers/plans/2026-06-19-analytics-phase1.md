# Analytics Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Analytics tab to the session summary page with a fatigue curve (points per end) and score distribution histogram.

**Architecture:** Pure calculation functions live in `src/lib/domain/analytics.ts` (no React, no Prisma). Two Recharts chart components are added inline to `SummaryClient.tsx`. A tab bar switches between the existing Overview content and the new Analytics charts.

**Tech Stack:** Recharts v2, React useState, existing SessionData types

## Global Constraints

- Mobile-first: all touch targets min 44px height, ResponsiveContainer on every chart, no hover-only interactions
- `src/lib/domain/analytics.ts` must be pure functions only — no React, no DOM, no Prisma imports
- Reuse existing score colors — do not invent new color values
- `'use client'` is already set on SummaryClient.tsx — Recharts imports go there directly, no dynamic import needed
- Run `npm test` after every task to confirm nothing regresses

---

### Task 1: Install Recharts and create analytics domain functions

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/domain/analytics.ts`
- Create: `src/__tests__/domain/analytics.test.ts`

**Interfaces:**
- Produces:
  - `pointsPerEnd(session: SessionData): number[]`
  - `scoreDistribution(session: SessionData): Record<ScoreValue, number>`

- [ ] **Step 1: Install Recharts**

```bash
cd /path/to/project
npm install recharts
```

Expected: recharts appears in `package.json` dependencies.

- [ ] **Step 2: Verify install**

```bash
npm ls recharts
```

Expected: `recharts@x.x.x` listed without errors.

- [ ] **Step 3: Write the failing tests**

Create `src/__tests__/domain/analytics.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pointsPerEnd, scoreDistribution } from '@/lib/domain/analytics'
import type { SessionData, ScoreValue } from '@/lib/domain/types'

const POINTS: Record<ScoreValue, number> = {
  X: 5, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, M: 0,
}

function makeSession(endArrows: ScoreValue[][]): SessionData {
  return {
    id: 'test',
    modality: 'INDOOR',
    targetVariant: '1-SPOT',
    createdAt: '2026-01-01T00:00:00Z',
    ends: endArrows.map((scores, endIdx) => ({
      id: `end-${endIdx}`,
      index: endIdx,
      arrows: scores.map((score, arrowIdx) => ({
        id: `arrow-${endIdx}-${arrowIdx}`,
        index: arrowIdx,
        score,
        points: POINTS[score],
        isX: score === 'X',
        x: 100,
        y: 100,
      })),
    })),
  }
}

describe('pointsPerEnd', () => {
  it('returns one total per end', () => {
    const session = makeSession([
      ['X', '5', '4'],  // 5+5+4 = 14
      ['3', '2', '1'],  // 3+2+1 = 6
      ['5', '5', 'M'],  // 5+5+0 = 10
    ])
    expect(pointsPerEnd(session)).toEqual([14, 6, 10])
  })

  it('returns empty array for session with no ends', () => {
    const session = makeSession([])
    expect(pointsPerEnd(session)).toEqual([])
  })

  it('returns 0 for an end with no arrows', () => {
    const session = makeSession([[]])
    expect(pointsPerEnd(session)).toEqual([0])
  })
})

describe('scoreDistribution', () => {
  it('counts each score value across all ends', () => {
    const session = makeSession([
      ['X', 'X', '5'],
      ['4', '3', 'M'],
    ])
    expect(scoreDistribution(session)).toEqual({
      X: 2, '5': 1, '4': 1, '3': 1, '2': 0, '1': 0, M: 1,
    })
  })

  it('returns all zeros for empty session', () => {
    const session = makeSession([])
    expect(scoreDistribution(session)).toEqual({
      X: 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, M: 0,
    })
  })
})
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npm test
```

Expected: `analytics.test.ts` fails with "Cannot find module '@/lib/domain/analytics'".

- [ ] **Step 5: Create `src/lib/domain/analytics.ts`**

```ts
import type { SessionData, ScoreValue } from './types'

const SCORE_VALUES: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

export function pointsPerEnd(session: SessionData): number[] {
  return session.ends.map(e =>
    e.arrows.reduce((sum, a) => sum + a.points, 0)
  )
}

export function scoreDistribution(session: SessionData): Record<ScoreValue, number> {
  const dist = Object.fromEntries(SCORE_VALUES.map(s => [s, 0])) as Record<ScoreValue, number>
  for (const end of session.ends) {
    for (const arrow of end.arrows) {
      dist[arrow.score]++
    }
  }
  return dist
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npm test
```

Expected: all tests pass including the 2 new `analytics.test.ts` suites (5 new tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/analytics.ts src/__tests__/domain/analytics.test.ts package.json package-lock.json
git commit -m "feat: add analytics domain functions and install recharts"
```

---

### Task 2: Add tab bar and fatigue curve chart

**Files:**
- Modify: `src/app/sessions/[id]/summary/SummaryClient.tsx`

**Interfaces:**
- Consumes: `pointsPerEnd(session: SessionData): number[]` from `@/lib/domain/analytics`

- [ ] **Step 1: Add imports to `SummaryClient.tsx`**

At the top of the file, after the existing imports, add:

```ts
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
} from 'recharts'
import { pointsPerEnd } from '@/lib/domain/analytics'
```

- [ ] **Step 2: Add tab state**

Inside `SummaryClient` function body, after the existing state declarations (`const [session, ...]`), add:

```ts
const [tab, setTab] = useState<'overview' | 'analytics'>('overview')
```

- [ ] **Step 3: Add the FatigueCurve component**

Add this component above the `SummaryClient` export (after the existing `StarRating` component definition):

```tsx
function FatigueCurve({ session }: { session: SessionData }) {
  const pts = pointsPerEnd(session)
  if (pts.length === 0) return null
  const avg = pts.reduce((s, p) => s + p, 0) / pts.length
  const data = pts.map((p, i) => ({ end: `E${i + 1}`, pts: p }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Points per end</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Avg <span className="font-medium text-gray-600 dark:text-gray-300">{avg.toFixed(1)}</span> pts
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis dataKey="end" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [`${v} pts`, 'Score']}
          />
          <ReferenceLine
            y={avg}
            stroke="#9ca3af"
            strokeDasharray="4 2"
            label={{ value: `avg`, position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="pts"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Add the tab bar and wire the analytics tab into the JSX**

In the `return` of `SummaryClient`, the current structure is:

```tsx
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header className="...">...</header>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* existing content */}
    </div>
  </div>
)
```

Replace with:

```tsx
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      {/* existing header content — do not change */}
    </header>

    {/* Tab bar */}
    <div className="sticky top-0 z-10 flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {(['overview', 'analytics'] as const).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`flex-1 py-3 text-sm font-medium capitalize transition-colors
            ${tab === t
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400'
            }`}
        >
          {t === 'overview' ? 'Overview' : 'Analytics'}
        </button>
      ))}
    </div>

    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {tab === 'overview' && (
        <>
          {/* paste all existing content here exactly as-is */}
        </>
      )}
      {tab === 'analytics' && (
        <FatigueCurve session={session} />
      )}
    </div>
  </div>
)
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/sessions/[id]/summary/SummaryClient.tsx
git commit -m "feat: add analytics tab with fatigue curve chart"
```

---

### Task 3: Add score distribution histogram

**Files:**
- Modify: `src/app/sessions/[id]/summary/SummaryClient.tsx`

**Interfaces:**
- Consumes: `scoreDistribution(session: SessionData): Record<ScoreValue, number>` from `@/lib/domain/analytics`

- [ ] **Step 1: Add Recharts bar chart imports**

In `SummaryClient.tsx`, extend the existing recharts import line to add:

```ts
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,               // ← add these three
} from 'recharts'
```

Also add `scoreDistribution` to the analytics import:

```ts
import { pointsPerEnd, scoreDistribution } from '@/lib/domain/analytics'
```

- [ ] **Step 2: Extract score colors as a shared constant**

In `SummaryClient.tsx`, the `scoreToColor` function currently defines the map inline. Replace it with a named constant + a thin wrapper so both the existing shot chart and the new histogram use the same values:

```ts
// Replace the existing scoreToColor function with:
const SCORE_COLORS: Record<ScoreValue, string> = {
  X: '#15803d', '5': '#22c55e', '4': '#84cc16',
  '3': '#eab308', '2': '#f97316', '1': '#ef4444', M: '#dc2626',
}

function scoreToColor(score: ScoreValue): string {
  return SCORE_COLORS[score]
}
```

- [ ] **Step 3: Add the ScoreHistogram component**

Add this immediately after the `FatigueCurve` component:

```tsx
const SCORE_ORDER: ScoreValue[] = ['X', '5', '4', '3', '2', '1', 'M']

function ScoreHistogram({ session }: { session: SessionData }) {
  const dist = scoreDistribution(session)
  const data = SCORE_ORDER.map(s => ({ score: s, count: dist[s], color: SCORE_COLORS[s] }))
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Score distribution</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{total} arrows total</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis dataKey="score" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [v, 'arrows']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Add ScoreHistogram to the analytics tab**

In the `analytics` tab section, add `ScoreHistogram` below `FatigueCurve`:

```tsx
{tab === 'analytics' && (
  <>
    <FatigueCurve session={session} />
    <ScoreHistogram session={session} />
  </>
)}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/sessions/[id]/summary/SummaryClient.tsx
git commit -m "feat: add score distribution histogram to analytics tab"
```
