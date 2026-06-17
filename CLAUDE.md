@AGENTS.md

# Arquearia — Archery Training App

## Project Overview

Web app to record archery training sessions. User marks arrows on an SVG target (press + drag), app auto-calculates scores and tracks running totals per session.

**Node setup:** nvm is required. Always run `source ~/.nvm/nvm.sh` before any node/npm commands. Node version is pinned in `.nvmrc` (v20).

## Stack

- Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- SQLite via Prisma ORM (`DATABASE_URL=file:./dev.db`), client at `src/generated/prisma`
- Single-user MVP — no auth
- SVG for targets (not canvas)
- Vitest for unit tests (excludes `src/app/**`)
- Dark mode via `ThemeContext` + `localStorage` + `darkMode: 'class'` in `tailwind.config.ts`

## Running the project

```bash
source ~/.nvm/nvm.sh
npm install
npx prisma migrate dev
npm run dev       # http://localhost:3000
npm run test      # Vitest unit tests on domain layer
```

## Architecture rule (CRITICAL)

`src/lib/domain/` must be 100% pure — zero imports from React, Next.js, Prisma, or DOM. This layer is the future React Native port target.

```
src/lib/domain/
  types.ts      — all shared TypeScript types
  rounds.ts     — modality configs as data (INDOOR, FLINT) + helpers
  scoring.ts    — pure scoring functions
  target.ts     — SVG ring geometry + inferScoreFromCoords
```

## Modalities

### Indoor Round
- 12 ends × 5 arrows = 60 arrows total
- Single distance: 20yd
- Scoring: X (5pts), 5, 4, 3, 2, 1, M (0pts). X counted separately for tiebreak.
- Target: user chooses **1-spot** (single blue face) or **5-spot** (quincunx) at session creation

### Flint Round
- **14 ends** × 4 arrows = 56 arrows total (2 identical passes through the same 7-end sequence)
- Scoring: X (5pts), 5, 4, 3, M (0pts)
- Distances and target auto-selected per end (ends 7–13 mirror ends 0–6):

| End | Distance | Target |
|-----|----------|--------|
| 0 / 7  | 25yd     | 1-spot Flint |
| 1 / 8  | 20ft     | 4-spot Flint |
| 2 / 9  | 30yd     | 1-spot Flint |
| 3 / 10 | 15yd     | 4-spot Flint |
| 4 / 11 | 20yd     | 1-spot Flint |
| 5 / 12 | 10yd     | 4-spot Flint |
| 6 / 13 | Walk-up (30/25/20/15yd per arrow) | 1-spot Flint |

## Target Variants

All targets use `viewBox="0 0 200 200"`. Arrow (x,y) stored in SVG coords. Arrow dot radius = 3 SVG units (4.5 when showing score label).

**Line rule:** `edgeDistance = dist(click, spotCenter) - 3`. Award ring where `edgeDistance <= ring.outerRadius`.

### Indoor (blue/white)
- **1-spot**: center (100,100), outer ring radius 84
- **5-spot**: quincunx centers at (42,42),(158,42),(100,100),(42,158),(158,158), each radius 32

| Score | outerRadius | Fill |
|-------|-------------|------|
| X | 8 | #FFFFFF |
| 5 | 15 | #FFFFFF |
| 4 | 30 | #2B3990 |
| 3 | 46 | #2B3990 |
| 2 | 65 | #2B3990 |
| 1 | 84 | #2B3990 |

Multi-spot ring radius = (outerRadius / 84) × spotRadius

### Flint (black/white)
- **1-spot**: center (100,100), outer ring radius 80
- **4-spot**: 2×2 grid centers at (50,50),(150,50),(50,150),(150,150), each radius 40

| Score | outerRadius | Fill |
|-------|-------------|------|
| X | 8 | #1A1A1A |
| 5 | 18 | #FFFFFF |
| 4 | 45 | #FFFFFF |
| 3 | 80 | #1A1A1A |

Multi-spot ring radius = (outerRadius / 80) × spotRadius

## Double-Hit Rule (multi-spot targets)

If two arrows land on the same spot: lower score is valid, higher score becomes M (0pts).
Handled server-side via `resolveDoubleHit()` domain function in the POST arrow API route.

## Key UX Rules

1. Arrow table in each end sorted **descending** (X first, M last) — NFAA scorecard standard
2. Score auto-inferred from click position, always overridable via dropdown
3. End auto-advances when all arrows placed (5 Indoor, 4 Flint)
4. Walk-up end 6/13: distance label updates per arrow (30yd → 25yd → 20yd → 15yd), 1-spot target
5. Double-hit toast shown when collision detected
6. **Ghost arrows**: Indoor only — previous end's arrows shown at 28% opacity until first arrow of new end is placed
7. **Undo button**: removes last arrow; if current end is empty, removes last arrow of previous end and navigates back
8. **Score colours**: green (X/5) → yellow (3/4) → red (1/M) in table and summary
9. **Arrow dot label**: placed arrows show their score centered inside the dot on the target
10. **Live score in zoom overlay**: drag crosshair shows a red badge with the inferred score, updating in real time

## Touch / Mobile (iOS Safari)

- `export const viewport: Viewport` in `layout.tsx` is critical — without it iOS Safari renders at 980px and all tap coordinates are wrong
- `allowedDevOrigins` in `next.config.ts` required for iPhone to load JS bundles from non-localhost dev IP
- `ArcheryTarget` uses `onTouchStart/Move/End` as the primary mobile path (calls `e.preventDefault()`)
- Pointer events guard with `if (e.pointerType === 'touch') return` to prevent double-firing
- SVG has `style={{ WebkitTapHighlightColor: 'transparent' }}`
- Touch targets (buttons, theme toggle) minimum 40×40px

## Data Model (Prisma)

```prisma
model Session {
  id            String   @id @default(cuid())
  modality      String   // "INDOOR" | "FLINT"
  targetVariant String   @default("1-SPOT") // "1-SPOT" | "5-SPOT" | "4-SPOT"
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
  score     String  // "X"|"5"|"4"|"3"|"2"|"1"|"M"
  points    Int
  isX       Boolean @default(false)
  x         Float
  y         Float
  distance  String?
  spotIndex Int?    // null = 1-spot; 0-indexed for multi-spot
  @@unique([endId, index])
}
```

## API Routes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Body: `{ modality, targetVariant }` |
| GET | `/api/sessions/[id]` | Full session with ends + arrows |
| PATCH | `/api/sessions/[id]` | Body: `{ notes?, rating? }` |
| POST | `/api/sessions/[id]/ends` | Create end record; Body: `{ index }` |
| POST | `/api/sessions/[id]/ends/[endId]/arrows` | Add arrow; runs double-hit check server-side |
| PATCH | `/api/arrows/[id]` | Manual score override; recalculates points+isX |
| DELETE | `/api/arrows/[id]` | Remove arrow (used by undo) |

## Summary / Shot Chart

Accessible at `/sessions/[id]/summary`. Shows:
- Per-end score breakdown table with running total
- **Shot chart**: full target SVG with all arrows colour-coded by score (green=X/5 → red=M)
- **Grouping stats**: mean group radius, aim offset with cardinal direction label
- **Crosshair**: black with white halo, rendered on top of all arrows, marks the group centroid
- **Indoor**: single `SingleSpotView` (all arrows on one 200×200 SVG)
- **Indoor 5-spot / Flint 4-spot**: `PerSpotView` grid — one mini SVG per spot, zoomed to that spot's bounds
- **Flint**: shows `SingleSpotView` ("Single-face target") for 1-spot ends and `PerSpotView` ("Multi-face target") for 4-spot ends separately

## Implementation Status

- [x] Phase 0: Scaffold (Next.js + Prisma + Vitest)
- [x] Phase 1: Domain layer (`src/lib/domain/`) + unit tests (68/68 passing)
- [x] Phase 2: Prisma schema + migrations
- [x] Phase 3: API routes (sessions, ends, arrows with double-hit + undo)
- [x] Phase 4: Client API helpers (`src/lib/api/client.ts`)
- [x] Phase 5: UI components (target SVG, zoom overlay with live score, scoring table, session cards)
- [x] Phase 6: Pages (home, marking screen with ghost arrows + undo, summary with shot chart)
- [ ] Phase 7: Finalize tests
- [ ] Phase 8: README
