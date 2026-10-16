# Promotion → Campaign Details & Management — Design

**Status:** Approved by user (chat), 2026-10-13. Not yet implemented.
**Branch:** `integration/unified` (worktree `.worktrees/unified`), uncommitted.

## Goal

Let an artist tap any campaign in Artist Dashboard → Promotion and see a detailed
performance page (impressions/reach/clicks/CTR/spend/attributed outcomes,
interactive charts with time filters, audience insights) plus management
controls (pause/resume). Frontend demo only — no backend, no real ad delivery,
no real MBANK charges beyond what already exists.

## Audit findings (before design)

- No campaign-detail route exists anywhere in the codebase (confirmed via
  search) — this is new, not a duplicate of an existing screen.
- `Campaign` (`src/lib/promotion.ts`) only has: id, trackId, trackTitle, goal,
  budgetKgs, durationDays, estimatedReach, reachSoFar, newFollowers, status
  (`'active' | 'completed'`), createdAt, paymentRef, simulatedPayment. No
  impressions/clicks/CTR/spend/dates-as-display-fields/audience data.
- `artist-store.ts` only has `addCampaign` — no pause/resume action.
- The 3 existing demo campaigns (Steppe Lights, Night Train to Osh, Issyk
  Blue) are seeded in `artist-store.ts`'s `loadDemoAccount()` with fixed
  `reachSoFar`/`estimatedReach`/`budgetKgs`/`durationDays` — these are reused
  as-is, not rebuilt.
- No confirmation-dialog component exists in the app. Closest pattern is a
  dedicated full-screen bottom-sheet route (`app/sheets/support-confirm.tsx`)
  — heavier than a quick pause/resume confirm needs.
- `components/dashboard/listen-trend-chart.tsx` (`ListenTrendChart`) is
  already generic (`points: TrendPoint[]`) and fully reusable for the new
  charts — no new charting code needed.
- Existing features explicitly NOT to be rebuilt: 4-step campaign creation
  wizard (`app/profile/artist/promote.tsx`), track selection, objective
  selection, budget/duration selection, simulated MBANK payment, campaign
  success confirmation, active/completed campaign cards in
  `app/profile/artist/dashboard/promotion.tsx`, mock reach/follower metrics.

## Decisions made with the user

1. **Pause/Resume confirmation:** inline expand-in-place on the Campaign
   Details screen ("Pause this campaign? [Cancel] [Pause]") — no new route,
   no new sheet. Matches the app's minimalism and avoids inventing a new UI
   pattern for a two-button confirm.
2. **Editable campaign settings:** nothing numeric is editable after payment.
   Budget and duration stay fixed once funded via MBANK (matches how real ad
   platforms treat a funded campaign). "Management" = pause, resume, view
   details only.

## Key architectural decision — no live "progression" engine

Today, `reachSoFar`/`newFollowers` are frozen snapshots (set once at
creation/seed time, never tick on their own — there is no live or
wall-clock-driven accrual anywhere in this codebase currently). This design
preserves that same honest architecture rather than inventing elapsed-day or
real-time accrual logic.

Every new metric (impressions, clicks, CTR, spend, attributed outcome, daily
charts, audience mix) is **deterministically derived** from each campaign's
existing stored fields (`reachSoFar`, `estimatedReach`, `budgetKgs`, `goal`,
`id`), scaled by a seeded PRNG multiplier keyed to the campaign's own id —
exactly mirroring the existing `src/lib/analytics-mock.ts` pattern
(`mulberry32` seeded from a string, remainder-forced percentages that sum to
100, etc.).

Consequences (all intentional, all satisfy the brief):
- A brand-new campaign (`reachSoFar: 0`) shows zero impressions/clicks/spend/
  attributed-everything automatically — no special-casing needed.
- Spend is `Math.min(budgetKgs, …)`-clamped by construction, so campaign
  spending can never exceed the allocated budget.
- Promotion tab and Campaign Details never conflict, because both ultimately
  read the same stored fields on the same `Campaign` object — single source
  of truth, satisfying "keep mock data centralized."
- Pause/Resume only flips `status`; no numeric field needs to freeze or
  reconcile, because nothing was ticking in the first place. This is labeled
  in-code as a deliberate simplification, not an oversight.

## Data model changes

`src/lib/promotion.ts`:
```ts
export type CampaignStatus = 'active' | 'paused' | 'completed'; // was: 'active' | 'completed'
```
No other fields added to `Campaign` — everything else is derived at read time
by the new `getCampaignAnalytics()`.

`src/lib/campaign-analytics-mock.ts` (new file, mirrors `analytics-mock.ts`):
```ts
export type CampaignPeriod = '7d' | '14d' | '30d' | 'lifetime';

export type CampaignAnalytics = {
  impressions: number;
  clicks: number;
  ctrPct: number;
  spentKgs: number;          // <= campaign.budgetKgs, always
  remainingBudgetKgs: number;
  costPerClickKgs: number;
  // Goal-specific outcome (only the one matching campaign.goal is populated
  // with a meaningful value; the others are present as 0 for type simplicity
  // but the UI only renders the one matching the goal):
  attributedStreams: number;       // goal: 'streams'
  costPerAttributedStreamKgs: number;
  attributedNewFollowers: number;  // goal: 'followers' (mirrors campaign.newFollowers for consistency)
  costPerFollowerKgs: number;
  attributedPlaylistAdds: number;  // goal: 'playlists'
  progressPct: number;        // reachSoFar / estimatedReach, clamped 0-100, 100 if completed
  daysRemaining: number;      // 0 if completed
  dailyPerformance: TrendPoint[];  // reach/impressions-shaped seeded curve, length depends on period
  dailySpend: TrendPoint[];        // cumulative, monotonic, last point === spentKgs
  audience: {
    topCountries: { name: LocalizedText; pct: number }[];
    topCities: { name: LocalizedText; pct: number }[];
    ageGroups: { label: string; pct: number }[];
    devices: { name: LocalizedText; pct: number }[];
  };
};

export function getCampaignAnalytics(campaign: Campaign, period: CampaignPeriod): CampaignAnalytics;
```

Seeded by `campaign.id` (+ period for the chart point count), so figures are
deterministic and reproducible — same invariant style as
`verify-analytics-mock.mjs` already enforces for `analytics-mock.ts`
(percentages sum to 100, deterministic given same inputs, peak equals the
real max of the trend, etc.). A new `verify-campaign-analytics-mock.mjs` will
assert the same class of invariants, plus: `spentKgs <= budgetKgs` always,
`dailySpend` is monotonic and its last point equals `spentKgs`,
`progressPct` is 0-100.

Attributed streams are explicitly scaled to stay well below the track's own
total streams (checked against `getTrackAnalytics(trackId, 'all').streams`),
and the UI labels it "Attributed — part of the track's total streams (see
Analytics)" so it never reads as contradicting the Analytics tab.

## State changes

`src/state/artist-store.ts`: add two actions —
```ts
pauseCampaign: (campaignId: string) => void;   // no-op if not found or already completed/paused
resumeCampaign: (campaignId: string) => void;  // no-op if not found or not paused
```
Both just flip `status` on the matching campaign in the `campaigns` array
(same persistence path as `addCampaign` — if `demoAccount`, write the
non-seeded campaigns back to the demo snapshot in localStorage).

## UI changes

**New route** `src/app/profile/artist/campaign/[id].tsx` — full-screen stack
push (outside the dashboard tab bar), same navigation pattern as
`promote.tsx`/`upload-track.tsx`. Not found → empty state with a back link
(matches `support-confirm.tsx`'s not-found pattern).

Sections, top to bottom:
1. **Campaign overview card** — track artwork + title, objective, status
   badge (Active/Paused/Completed, distinct colors), budget/spent/remaining,
   start/end dates, days remaining.
2. **Performance stat grid** — impressions, reach, clicks, CTR, the one
   goal-specific outcome metric + its cost-per metric. "Demo data" badge.
3. **Daily Performance chart** — `ListenTrendChart` fed by
   `dailyPerformance`, with period chips (7d/14d/30d/lifetime) clamped to the
   campaign's actual duration.
4. **Budget Spend chart** — `ListenTrendChart` fed by `dailySpend`.
5. **Progress bar** — reusing the existing progress-bar visual style already
   in `promotion.tsx`'s active-campaign card.
6. **Audience insights card** — top countries/cities/age/devices, "Demo data"
   badge, visibly distinct values from the Analytics tab (different seed).
7. **Management row** — Pause/Resume button (inline-confirms before acting;
   hidden entirely for completed campaigns), "Back to Promotion" link.

**`src/app/profile/artist/dashboard/promotion.tsx`** (existing, extend only):
- Active-campaign hero card and each `CampaignRow` become pressable
  (`PressableScale` → `router.push('/profile/artist/campaign/[id]')`),
  layout/styling unchanged.
- Add a status filter-chip row above "Your campaigns"
  (All/Active/Paused/Completed), mirroring the exact `FILTERS` pattern
  already used on Overview's "Your Releases" (`dashboard/index.tsx`).
- `CampaignRow`'s status label/color gains a `'paused'` case alongside the
  existing active/completed cases.

## i18n

New keys added to both `EN_STRINGS`/`RU_STRINGS` in `lib/dashboard-i18n.ts`
for: campaign overview field labels, performance metric labels, chart
section headers, audience section headers, pause/resume CTAs and inline
confirm copy, status filter chip labels (reusing `filterAll`/style pattern),
"attributed" disclaimer copy. Exact key list finalized during implementation,
following the existing flat `t(key)` convention.

## Testing plan

- `npx tsc --noEmit` clean.
- New `scripts/verify-campaign-analytics-mock.mjs`: determinism, spend never
  exceeds budget, dailySpend monotonic and ends at spentKgs, audience
  percentages sum to 100, progressPct in [0,100].
- Extend/add a verify script for `pauseCampaign`/`resumeCampaign` store
  actions (no-op guards, status transitions), alongside the existing
  `verify-artist-store.mjs` style.
- Manual browser pass (Chrome via claude-in-chrome): full flow Dashboard →
  Promotion → Campaign → Details → chart filters → Pause → inline confirm →
  Resume → Back to Promotion, for both a pre-seeded and a freshly-created
  campaign; verify mobile-width layout; verify Promotion/Overview/Analytics/
  Studio Pro are visually unchanged.
- Independent code-review subagent pass (per `requesting-code-review` skill)
  before reporting done.

## Explicitly out of scope

No editable budget/duration, no new payment/top-up flow, no changes to
Overview, general Analytics, Studio Pro, Discover, the music player, or
Living Moods.
