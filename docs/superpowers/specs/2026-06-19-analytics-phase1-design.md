# Analytics Phase 1 — Design Spec

**Date:** 2026-06-19
**Scope:** Fatigue curve + score distribution histogram on the session summary page.

---

## Goal

Add an "Analytics" tab to the existing session summary page, showing two charts:
1. **Fatigue curve** — points per end over the session (line chart)
2. **Score distribution** — count of each score value X→M (histogram)

---

## Constraints

- **Mobile-first** — all charts must be touch-friendly and responsive; no hover-only interactions
- Pure function architecture: all calculations in `lib/domain/analytics.ts`, no React/Prisma inside
- Unit-tested: each function gets tests with known input → expected output
- No new charting library except **Recharts** (to be installed)

---

## Domain Layer

**File:** `src/lib/domain/analytics.ts`

```ts
pointsPerEnd(session: SessionData): number[]
// Returns one number per end (sum of arrow points). Empty ends → 0.

scoreDistribution(session: SessionData): Record<ScoreValue, number>
// Returns count of each score value across all ends. Missing values → 0.
```

**File:** `src/__tests__/domain/analytics.test.ts`
- `pointsPerEnd`: known session with 3 ends → [15, 12, 14]
- `scoreDistribution`: known arrows → { X: 2, '5': 3, ... }

---

## UI Layer

### Tab structure

Two tabs added to `SummaryClient.tsx`:
- **Overview** — all existing content (score card, shot chart, rating, notes, arrow table)
- **Analytics** — new charts

Tab state: `useState<'overview' | 'analytics'>`, local only (no URL, no router).
Tab bar: full-width, sticky below the header. Large touch targets (min 44px height).

### Fatigue curve (Front 1.1)

- Recharts `LineChart` inside `ResponsiveContainer` (width 100%, height ~220px)
- X axis: end numbers (E1, E2, …)
- Y axis: points (0 to max possible per end)
- Primary line: actual points per end
- Reference line: session average (horizontal dashed)
- Optional: 2-end moving average as secondary dashed line (toggle button below chart)
- Colors: blue for actual line, gray dashed for average, lighter blue dashed for moving avg

### Score distribution (Front 1.2)

- Recharts `BarChart` inside `ResponsiveContainer` (width 100%, height ~200px)
- X axis: score labels (X, 5, 4, 3, 2, 1, M)
- Y axis: count
- Bar colors: reuse existing `scoreToColor` map from `SummaryClient.tsx` (move to shared constant)
- No legend needed — colors are self-explanatory with X→M labels

---

## File Changes

| Action | File |
|--------|------|
| Create | `src/lib/domain/analytics.ts` |
| Create | `src/__tests__/domain/analytics.test.ts` |
| Modify | `src/app/sessions/[id]/summary/SummaryClient.tsx` — add tabs + chart components |
| Install | `recharts` (npm) |

Chart components can live inline in `SummaryClient.tsx` initially — extract to `src/components/analytics/` only if the file grows unwieldy.

---

## Out of scope

- Cross-session charts (Phase 2)
- Export (Phase 3)
- Moving average is optional — include if it doesn't complicate the implementation
