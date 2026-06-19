# Quiver — Roadmap

_Last updated: 2026-06-19_

---

## Phase 1 — Analytics Foundation

**Goal:** Set up the analytics architecture and deliver the first visible metrics.

- `lib/domain/analytics.ts` — pure functions, no React/DOM/Prisma; fully unit-tested
- **Front 1.1** Fatigue/focus curve (points per end) — line chart with session average reference line
- **Front 1.2** Score distribution histogram — X, 5, 4, 3, 2, 1, M using existing app colors
- Export data (CSV) — sessions and arrows

---

## Phase 2 — Retention + Advanced Diagnostics

**Goal:** Cross-session insights and technical pattern detection.

### Retention
- **Front 2.1** Temporal progression — score and avg group radius over time, split by modality
- **Front 2.2** Personal records — best score, best end, tightest group, most Xs; highlight when beaten

### Advanced diagnostics
- **Front 1.4** Dispersion ellipse — std dev in X and Y separately; replace current circle on shot chart
- **Front 3.1** Group centroid + systematic bias — direction label ("shifted left and slightly high")
- **Front 1.3** Clock map — 8 sectors (atan2 on x,y); radar chart or lightweight overlay on shot chart
- **Front 3.2** Pattern → hypothesis table — maps orientation/position to likely causes (barebow/recurve); requires dominant hand on user profile; always presented as suggestion, never diagnosis
- **Front 3.3** Outlier detection — flag fliers beyond N std devs; show group radius with/without; toggle in UI
- **Front 2.3** Consistency — std dev of points-per-end within session; trend line across sessions

**Prerequisites before Front 3.2:**
- Add dominant hand field (right/left) to user profile or session
- Confirm x,y coordinates are persisted per arrow (shot chart suggests yes)

---

## Phase 3 — Reach

**Goal:** Expand to non-Portuguese speakers.

- Multi-language support (i18n) — `next-intl` for Next.js 15 App Router

---

## Phase 4 — Auth

**Goal:** Easier onboarding.

- Google OAuth — NextAuth provider addition

---

## Phase 5 — Infrastructure

**Goal:** Production-grade database when scale requires it.

- Postgres migration — swap `better-sqlite3` adapter; re-run migrations; ~half day

---

## Non-goals (for now)

- Never present pattern hypotheses as definitive diagnosis — always suggestions
- Don't mix modalities in temporal series
- Don't optimize prematurely — start with simple rules, tune with real data
