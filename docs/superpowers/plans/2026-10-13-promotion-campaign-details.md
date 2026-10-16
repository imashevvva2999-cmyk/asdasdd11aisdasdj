# Promotion → Campaign Details & Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Campaign Details page (performance stats, charts, audience insights) reachable by tapping any campaign in Artist Dashboard → Promotion, plus Pause/Resume campaign management — all mock/demo data, no backend.

**Architecture:** A new deterministic mock-data module (`lib/campaign-analytics-mock.ts`) mirrors the existing `lib/analytics-mock.ts` pattern exactly (seeded PRNG keyed by id, no live/time-based accrual). A new full-screen route (`app/profile/artist/campaign/[id].tsx`) reads a campaign from the existing `artist-store` and renders it. Two new store actions (`pauseCampaign`/`resumeCampaign`) flip a campaign's status. The existing Promotion screen (`app/profile/artist/dashboard/promotion.tsx`) is extended, not rebuilt, to navigate into the new route and add a status filter.

**Tech Stack:** React Native / Expo Router, TypeScript, Zustand (`artist-store`), `react-native-svg` (via the existing `ListenTrendChart`), the project's own `tsx`-based `scripts/verify-*.mjs` test convention (no Jest).

**Spec:** `docs/superpowers/specs/2026-10-13-promotion-campaign-details-design.md`

## Global Constraints

- No backend integration, no real advertising delivery, no real MBANK transaction beyond the campaign's original simulated payment at creation.
- No editable budget/duration after payment — management is pause/resume/view only.
- Completed campaigns must never be resumable.
- Campaign spending must never exceed the allocated budget.
- Keep mock data centralized and derived from a single source of truth (the `Campaign` object itself).
- Preserve the approved Mmusic design: dark premium interface, existing red accent (`Colors.primary`), existing typography, existing navigation, existing campaign card visuals, minimalistic layout, responsive desktop/mobile.
- Do not modify Overview, general Analytics, Studio Pro, Discover, the music player, or Living Moods.
- Every new user-facing string must exist in both `EN_STRINGS` and `RU_STRINGS` in `lib/dashboard-i18n.ts`, and the two values must differ (enforced by the existing `verify-dashboard-i18n.mjs`).
- Do not commit, push, merge, or deploy without the user's explicit approval.

## Review Focus

- Filtering the campaign list to a status with zero matches must show an empty state, not a blank gap (`noCampaignsForFilter` — Task 6).
- A freshly created campaign (`reachSoFar: 0`) must show all-zero impressions/clicks/spend/attributed metrics, with no `NaN`/`Infinity` from division by zero (Task 2).
- Completed campaigns must never expose Pause/Resume controls in the UI, and the store actions must refuse to resume (or re-pause) a completed campaign even if called directly (Task 3 + Task 5).
- Opening `/profile/artist/campaign/[id]` with an `id` matching no campaign (stale link, demo reset) must show a "not found" state, never crash (Task 5).
- Campaign spend must never exceed its budget, and the daily-spend chart must be monotonically non-decreasing and end exactly at the computed spend (Task 2).

---

## Task 1: Export the shared seeded-PRNG helpers from `analytics-mock.ts`

**Files:**
- Modify: `apps/mobile/src/lib/analytics-mock.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function mulberry32(seed: number): () => number` and `export function seedFromString(s: string): number` — both consumed by Task 2's `campaign-analytics-mock.ts`.

- [ ] **Step 1: Export `mulberry32` and extract a generic `seedFromString`**

In `apps/mobile/src/lib/analytics-mock.ts`, change:

```ts
/** Small, seeded PRNG (mulberry32) — deterministic given the same seed. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(trackId: string, period: TimePeriod): number {
  const s = `${trackId}:${period}`;
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return hash >>> 0;
}
```

to:

```ts
/** Small, seeded PRNG (mulberry32) — deterministic given the same seed.
 * Exported so other deterministic mock-data modules (e.g.
 * campaign-analytics-mock.ts) share the exact same generator. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string hash → PRNG seed. Exported for other deterministic
 * mock-data modules to key their own PRNG off an arbitrary id string. */
export function seedFromString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return hash >>> 0;
}

function seedFrom(trackId: string, period: TimePeriod): number {
  return seedFromString(`${trackId}:${period}`);
}
```

This is a pure refactor — `seedFrom`'s output is byte-identical before and after (same string concatenation, same hash loop), so `getTrackAnalytics`'s existing behavior is unchanged.

- [ ] **Step 2: Run the existing analytics-mock tests to confirm no behavior changed**

Run: `cd apps/mobile && npx tsx scripts/verify-analytics-mock.mjs`
Expected: `All analytics-mock checks passed.` (identical output to before the refactor — this proves the extraction didn't change any generated numbers).

- [ ] **Step 3: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add src/lib/analytics-mock.ts
git commit -m "refactor: export shared seeded-PRNG helpers from analytics-mock"
```

---

## Task 2: Campaign status type + deterministic campaign analytics mock

**Files:**
- Modify: `apps/mobile/src/lib/promotion.ts`
- Create: `apps/mobile/src/lib/campaign-analytics-mock.ts`
- Create: `apps/mobile/scripts/verify-campaign-analytics-mock.mjs`

**Interfaces:**
- Consumes: `mulberry32`, `seedFromString`, `getTrackAnalytics` from `lib/analytics-mock.ts` (Task 1); `Campaign`, `PromoGoal` from `lib/promotion.ts`; `LocalizedText` from `lib/dashboard-i18n.ts`.
- Produces: `CampaignStatus = 'active' | 'paused' | 'completed'` (was `'active' | 'completed'`); `CampaignPeriod = '7d' | '14d' | '30d' | 'lifetime'`; `CampaignChartPoint = { label: string; value: number }`; `CampaignAnalytics` type; `getCampaignAnalytics(campaign: Campaign, period: CampaignPeriod): CampaignAnalytics` — consumed by Task 5 (UI) and Task 7 (verification).

- [ ] **Step 1: Widen `CampaignStatus` in `lib/promotion.ts`**

In `apps/mobile/src/lib/promotion.ts`, change:

```ts
export type CampaignStatus = 'active' | 'completed';
```

to:

```ts
export type CampaignStatus = 'active' | 'paused' | 'completed';
```

- [ ] **Step 2: Write the failing verify script for `getCampaignAnalytics`**

Create `apps/mobile/scripts/verify-campaign-analytics-mock.mjs`:

```js
#!/usr/bin/env node
/**
 * Campaign analytics mock data: deterministic, budget-safe invariants
 * (Promotion → Campaign Details). Usage:
 * npx tsx scripts/verify-campaign-analytics-mock.mjs
 */
import { getCampaignAnalytics } from '../src/lib/campaign-analytics-mock.ts';
import { getTrackAnalytics } from '../src/lib/analytics-mock.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const activeCampaign = {
  id: 'demo-cmp-osh',
  trackId: 'demo-release-night-osh',
  trackTitle: 'Night Train to Osh',
  goal: 'streams',
  budgetKgs: 5000,
  durationDays: 14,
  estimatedReach: 85000,
  reachSoFar: 61200,
  newFollowers: 1240,
  status: 'active',
  createdAt: new Date().toISOString(),
  paymentRef: 'DEMO-7Q2K4M',
  simulatedPayment: true,
};

const freshCampaign = { ...activeCampaign, id: 'test-fresh-campaign', reachSoFar: 0, newFollowers: 0, status: 'active' };
const completedCampaign = { ...activeCampaign, id: 'demo-cmp-issyk', status: 'completed' };
const shortCampaign = { ...activeCampaign, id: 'demo-cmp-steppe', durationDays: 7, estimatedReach: 9000, reachSoFar: 9600, status: 'completed' };

const a = getCampaignAnalytics(activeCampaign, 'lifetime');
const b = getCampaignAnalytics(activeCampaign, 'lifetime');
check('same campaign+period is deterministic (same numbers every call)', JSON.stringify(a) === JSON.stringify(b));

check('spentKgs never exceeds budgetKgs', a.spentKgs <= activeCampaign.budgetKgs);
check('remainingBudgetKgs + spentKgs equals budgetKgs', a.remainingBudgetKgs + a.spentKgs === activeCampaign.budgetKgs);
check('progressPct is between 0 and 100', a.progressPct >= 0 && a.progressPct <= 100);
check('dailySpend is monotonic non-decreasing', a.dailySpend.every((p, i) => i === 0 || p.value >= a.dailySpend[i - 1].value));
check('dailySpend last point equals spentKgs', a.dailySpend[a.dailySpend.length - 1].value === a.spentKgs);
check('ctrPct is between 0 and 100', a.ctrPct >= 0 && a.ctrPct <= 100);

const trackTotal = getTrackAnalytics(activeCampaign.trackId, 'all').streams;
check("attributedStreams never exceeds 15% of the track's total streams", a.attributedStreams <= Math.round(trackTotal * 0.15));

const countryPcts = a.audience.topCountries.reduce((s, c) => s + c.pct, 0);
check('audience topCountries percentages sum to 100', Math.round(countryPcts) === 100);
const cityPcts = a.audience.topCities.reduce((s, c) => s + c.pct, 0);
check('audience topCities percentages sum to 100', Math.round(cityPcts) === 100);
const agePcts = a.audience.ageGroups.reduce((s, c) => s + c.pct, 0);
check('audience ageGroups percentages sum to 100', Math.round(agePcts) === 100);
const devicePcts = a.audience.devices.reduce((s, c) => s + c.pct, 0);
check('audience devices percentages sum to 100', Math.round(devicePcts) === 100);

const fresh = getCampaignAnalytics(freshCampaign, '7d');
check('a freshly created campaign (reachSoFar: 0) has zero impressions', fresh.impressions === 0);
check('a freshly created campaign has zero clicks', fresh.clicks === 0);
check('a freshly created campaign has zero spend', fresh.spentKgs === 0);
check('a freshly created campaign has zero attributed streams', fresh.attributedStreams === 0);
check('a freshly created campaign does not divide by zero (costPerClickKgs is 0, not NaN/Infinity)', fresh.costPerClickKgs === 0 && Number.isFinite(fresh.costPerClickKgs));
check('a freshly created campaign does not divide by zero (costPerAttributedStreamKgs is 0, not NaN/Infinity)', fresh.costPerAttributedStreamKgs === 0 && Number.isFinite(fresh.costPerAttributedStreamKgs));

const completed = getCampaignAnalytics(completedCampaign, 'lifetime');
check('a completed campaign has progressPct of exactly 100', completed.progressPct === 100);
check('a completed campaign has daysRemaining of 0', completed.daysRemaining === 0);
check('a completed campaign has fully spent its budget', completed.spentKgs === completedCampaign.budgetKgs);

const period7d = getCampaignAnalytics(activeCampaign, '7d');
const period14d = getCampaignAnalytics(activeCampaign, '14d');
check('a 7-day period produces 7 chart points', period7d.dailyPerformance.length === 7);
check('a 14-day period produces 14 chart points (campaign duration allows it)', period14d.dailyPerformance.length === 14);

const period30dOnShort = getCampaignAnalytics(shortCampaign, '30d');
check("requesting a longer period than the campaign's duration clamps to the duration", period30dOnShort.dailyPerformance.length === 7);

if (failures > 0) {
  console.error(`\n${failures} campaign-analytics-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll campaign-analytics-mock checks passed.');
```

- [ ] **Step 2b: Run it to confirm it fails (module doesn't exist yet)**

Run: `cd apps/mobile && npx tsx scripts/verify-campaign-analytics-mock.mjs`
Expected: FAIL with a module-not-found error for `../src/lib/campaign-analytics-mock.ts`.

- [ ] **Step 3: Implement `lib/campaign-analytics-mock.ts`**

Create `apps/mobile/src/lib/campaign-analytics-mock.ts`:

```ts
import { getTrackAnalytics, mulberry32, seedFromString } from './analytics-mock';
import type { LocalizedText } from './dashboard-i18n';
import type { Campaign } from './promotion';

/**
 * Deterministic mock campaign performance data (Artist Dashboard Promotion
 * → Campaign Details). No live or wall-clock-driven accrual: every figure
 * is derived from the campaign's own stored fields (reachSoFar, budgetKgs,
 * estimatedReach, goal), scaled by a PRNG seeded from the campaign's own
 * id — same architecture as lib/analytics-mock.ts. This guarantees a
 * brand-new campaign (reachSoFar: 0) shows zero everywhere, and spend can
 * never exceed budget by construction.
 */
export type CampaignPeriod = '7d' | '14d' | '30d' | 'lifetime';

export type CampaignChartPoint = { label: string; value: number };

export type CampaignAnalytics = {
  impressions: number;
  clicks: number;
  ctrPct: number;
  spentKgs: number;
  remainingBudgetKgs: number;
  costPerClickKgs: number;
  /** Populated regardless of goal; the UI only renders the metric matching campaign.goal. */
  attributedStreams: number;
  costPerAttributedStreamKgs: number;
  attributedNewFollowers: number;
  costPerFollowerKgs: number;
  attributedPlaylistAdds: number;
  progressPct: number;
  daysRemaining: number;
  dailyPerformance: CampaignChartPoint[];
  dailySpend: CampaignChartPoint[];
  audience: {
    topCountries: { name: LocalizedText; pct: number }[];
    topCities: { name: LocalizedText; pct: number }[];
    ageGroups: { label: LocalizedText; pct: number }[];
    devices: { name: LocalizedText; pct: number }[];
  };
};

const PERIOD_DAYS: Record<Exclude<CampaignPeriod, 'lifetime'>, number> = { '7d': 7, '14d': 14, '30d': 30 };

const COUNTRY_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Kyrgyzstan', ru: 'Кыргызстан' }, weight: 0.55 },
  { name: { en: 'Kazakhstan', ru: 'Казахстан' }, weight: 0.22 },
  { name: { en: 'Russia', ru: 'Россия' }, weight: 0.13 },
];

const CITY_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Bishkek', ru: 'Бишкек' }, weight: 0.5 },
  { name: { en: 'Osh', ru: 'Ош' }, weight: 0.2 },
  { name: { en: 'Almaty', ru: 'Алматы' }, weight: 0.15 },
];

const DEVICE_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Mobile app', ru: 'Мобильное приложение' }, weight: 0.6 },
  { name: { en: 'Web / desktop', ru: 'Веб / десктоп' }, weight: 0.25 },
  { name: { en: 'Smart speaker', ru: 'Умная колонка' }, weight: 0.07 },
];

const OTHER_LABEL: LocalizedText = { en: 'Other', ru: 'Другое' };

const AGE_POOL: { label: LocalizedText; weight: number }[] = [
  { label: { en: '18–24', ru: '18–24' }, weight: 0.3 },
  { label: { en: '25–34', ru: '25–34' }, weight: 0.35 },
  { label: { en: '35–44', ru: '35–44' }, weight: 0.2 },
];
const AGE_OTHER_LABEL: LocalizedText = { en: '45+', ru: '45+' };

function weightedSplit(rand: () => number, pool: { name: LocalizedText; weight: number }[], otherLabel: LocalizedText) {
  const raw = pool.map((p) => p.weight * (0.75 + rand() * 0.5));
  const sum = raw.reduce((s, v) => s + v, 0);
  const pcts = raw.map((v) => Math.round((v / sum) * 91));
  const last = 100 - pcts.reduce((s, v) => s + v, 0);
  return [...pool.map((p, i) => ({ name: p.name, pct: pcts[i]! })), { name: otherLabel, pct: last }];
}

function weightedAgeSplit(rand: () => number) {
  const raw = AGE_POOL.map((p) => p.weight * (0.75 + rand() * 0.5));
  const sum = raw.reduce((s, v) => s + v, 0);
  const pcts = raw.map((v) => Math.round((v / sum) * 91));
  const last = 100 - pcts.reduce((s, v) => s + v, 0);
  return [...AGE_POOL.map((p, i) => ({ label: p.label, pct: pcts[i]! })), { label: AGE_OTHER_LABEL, pct: last }];
}

export function getCampaignAnalytics(campaign: Campaign, period: CampaignPeriod): CampaignAnalytics {
  const rand = mulberry32(seedFromString(campaign.id));

  const progressPct =
    campaign.status === 'completed' ? 100 : Math.min(100, Math.round((campaign.reachSoFar / Math.max(1, campaign.estimatedReach)) * 100));
  const daysRemaining =
    campaign.status === 'completed' ? 0 : Math.max(0, campaign.durationDays - Math.round((progressPct / 100) * campaign.durationDays));

  const impressionsMultiplier = 3.2 + rand() * 2.3;
  const impressions = Math.round(campaign.reachSoFar * impressionsMultiplier);
  const ctrPct = Math.round((1.5 + rand() * 3) * 10) / 10;
  const clicks = Math.round(impressions * (ctrPct / 100));

  const spentKgs = Math.min(campaign.budgetKgs, Math.round(campaign.budgetKgs * (progressPct / 100)));
  const remainingBudgetKgs = campaign.budgetKgs - spentKgs;
  const costPerClickKgs = clicks > 0 ? Math.round((spentKgs / clicks) * 100) / 100 : 0;

  const trackTotalStreams = getTrackAnalytics(campaign.trackId, 'all').streams;
  const rawAttributedStreams = Math.round(clicks * (0.35 + rand() * 0.25));
  const attributedStreams = Math.min(rawAttributedStreams, Math.round(trackTotalStreams * 0.15));
  const costPerAttributedStreamKgs = attributedStreams > 0 ? Math.round((spentKgs / attributedStreams) * 100) / 100 : 0;

  const attributedNewFollowers = campaign.newFollowers;
  const costPerFollowerKgs = attributedNewFollowers > 0 ? Math.round((spentKgs / attributedNewFollowers) * 100) / 100 : 0;

  const attributedPlaylistAdds = Math.round(clicks * (0.03 + rand() * 0.04));

  const effectiveDays = period === 'lifetime' ? campaign.durationDays : Math.min(PERIOD_DAYS[period], campaign.durationDays);
  const safeDays = Math.max(1, effectiveDays);

  let trendValue = (impressions / safeDays) * 0.4;
  const dailyPerformance: CampaignChartPoint[] = Array.from({ length: safeDays }, (_, i) => {
    trendValue = Math.max(0, trendValue + (rand() - 0.3) * (impressions / safeDays || 1) * 0.6);
    return { label: `D${i + 1}`, value: Math.round(trendValue) };
  });

  const spendWeights = Array.from({ length: safeDays }, () => 0.4 + rand());
  const totalWeight = spendWeights.reduce((s, w) => s + w, 0);
  let cumSpend = 0;
  const dailySpend: CampaignChartPoint[] = spendWeights.map((w, i) => {
    const isLast = i === safeDays - 1;
    const share = isLast ? spentKgs - cumSpend : Math.min(spentKgs - cumSpend, Math.round((w / totalWeight) * spentKgs));
    cumSpend += share;
    return { label: `D${i + 1}`, value: cumSpend };
  });

  return {
    impressions,
    clicks,
    ctrPct,
    spentKgs,
    remainingBudgetKgs,
    costPerClickKgs,
    attributedStreams,
    costPerAttributedStreamKgs,
    attributedNewFollowers,
    costPerFollowerKgs,
    attributedPlaylistAdds,
    progressPct,
    daysRemaining,
    dailyPerformance,
    dailySpend,
    audience: {
      topCountries: weightedSplit(rand, COUNTRY_POOL, OTHER_LABEL),
      topCities: weightedSplit(rand, CITY_POOL, OTHER_LABEL),
      ageGroups: weightedAgeSplit(rand),
      devices: weightedSplit(rand, DEVICE_POOL, OTHER_LABEL),
    },
  };
}
```

- [ ] **Step 4: Run the verify script again — expect it to pass**

Run: `cd apps/mobile && npx tsx scripts/verify-campaign-analytics-mock.mjs`
Expected: `All campaign-analytics-mock checks passed.` If any check fails, read the failure label — it names exactly which invariant broke (e.g. "dailySpend last point equals spentKgs" means the spend-distribution loop has an off-by-one).

- [ ] **Step 5: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
cd apps/mobile
git add src/lib/promotion.ts src/lib/campaign-analytics-mock.ts scripts/verify-campaign-analytics-mock.mjs
git commit -m "feat: deterministic campaign analytics mock data"
```

---

## Task 3: Pause/Resume campaign store actions

**Files:**
- Modify: `apps/mobile/src/state/artist-store.ts`
- Create: `apps/mobile/scripts/verify-campaign-management.mjs`

**Interfaces:**
- Consumes: `Campaign`, `CampaignStatus` from `lib/promotion.ts` (Task 2).
- Produces: `pauseCampaign: (campaignId: string) => void` and `resumeCampaign: (campaignId: string) => void` on `useArtistStore` — consumed by Task 5 (UI).

- [ ] **Step 1: Write the failing verify script**

Create `apps/mobile/scripts/verify-campaign-management.mjs`:

```js
#!/usr/bin/env node
/**
 * Campaign pause/resume store actions (Artist Dashboard Promotion →
 * Campaign Details). Usage: npx tsx scripts/verify-campaign-management.mjs
 */
import { useArtistStore } from '../src/state/artist-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

function freshCampaign(overrides = {}) {
  return {
    id: 'test-campaign-1',
    trackId: 'test-track-1',
    trackTitle: 'Test Track',
    goal: 'streams',
    budgetKgs: 1000,
    durationDays: 7,
    estimatedReach: 5000,
    reachSoFar: 0,
    newFollowers: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    paymentRef: 'TEST-REF',
    simulatedPayment: true,
    ...overrides,
  };
}

useArtistStore.setState({ campaigns: [freshCampaign()] });
useArtistStore.getState().pauseCampaign('test-campaign-1');
check('pauseCampaign() moves an active campaign to paused', useArtistStore.getState().campaigns[0].status === 'paused');

useArtistStore.setState({ campaigns: [freshCampaign({ status: 'completed' })] });
useArtistStore.getState().pauseCampaign('test-campaign-1');
check('pauseCampaign() does not touch a completed campaign', useArtistStore.getState().campaigns[0].status === 'completed');

useArtistStore.setState({ campaigns: [freshCampaign()] });
let threw = false;
try {
  useArtistStore.getState().pauseCampaign('does-not-exist');
} catch {
  threw = true;
}
check('pauseCampaign() with an unknown id does not throw', !threw);
check('pauseCampaign() with an unknown id leaves other campaigns untouched', useArtistStore.getState().campaigns[0].status === 'active');

useArtistStore.setState({ campaigns: [freshCampaign({ status: 'paused' })] });
useArtistStore.getState().resumeCampaign('test-campaign-1');
check('resumeCampaign() moves a paused campaign to active', useArtistStore.getState().campaigns[0].status === 'active');

useArtistStore.setState({ campaigns: [freshCampaign({ status: 'completed' })] });
useArtistStore.getState().resumeCampaign('test-campaign-1');
check('resumeCampaign() does not touch a completed campaign (not resumable)', useArtistStore.getState().campaigns[0].status === 'completed');

useArtistStore.setState({ campaigns: [freshCampaign({ status: 'active' })] });
useArtistStore.getState().resumeCampaign('test-campaign-1');
check('resumeCampaign() leaves an already-active campaign untouched', useArtistStore.getState().campaigns[0].status === 'active');

if (failures > 0) {
  console.error(`\n${failures} campaign-management check(s) failed.`);
  process.exit(1);
}
console.log('\nAll campaign-management checks passed.');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-campaign-management.mjs`
Expected: FAIL — `pauseCampaign is not a function` (the action doesn't exist yet).

- [ ] **Step 3: Add the actions to `artist-store.ts`**

In `apps/mobile/src/state/artist-store.ts`, in the `ArtistState` type, add two lines directly after `addCampaign: (campaign: Campaign) => void;`:

```ts
  /** Stops delivery on an active campaign. No-op if the campaign doesn't exist or is already paused/completed. */
  pauseCampaign: (campaignId: string) => void;
  /** Resumes a paused campaign. No-op if the campaign doesn't exist, isn't paused, or is completed (completed campaigns are never resumable). */
  resumeCampaign: (campaignId: string) => void;
```

Then in the store body, directly after the existing `addCampaign` implementation:

```ts
  addCampaign: (campaign) => {
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },

  pauseCampaign: (campaignId) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === campaignId && c.status === 'active' ? { ...c, status: 'paused' } : c)),
    }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },

  resumeCampaign: (campaignId) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === campaignId && c.status === 'paused' ? { ...c, status: 'active' } : c)),
    }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },
```

- [ ] **Step 4: Run the verify script again — expect it to pass**

Run: `cd apps/mobile && npx tsx scripts/verify-campaign-management.mjs`
Expected: `All campaign-management checks passed.`

- [ ] **Step 5: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
cd apps/mobile
git add src/state/artist-store.ts scripts/verify-campaign-management.mjs
git commit -m "feat: pauseCampaign/resumeCampaign artist-store actions"
```

---

## Task 4: i18n strings for Campaign Details

**Files:**
- Modify: `apps/mobile/src/lib/dashboard-i18n.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: 38 new `DashboardStringKey` entries — consumed by Task 5 and Task 6.

- [ ] **Step 1: Add the new keys to `EN_STRINGS`**

In `apps/mobile/src/lib/dashboard-i18n.ts`, inside the `EN_STRINGS` object, directly before the closing `} as const;`, add:

```ts
  campaignDetailsTitle: 'Campaign details',
  campaignOverviewSection: 'Campaign overview',
  totalBudgetLabel: 'Total budget',
  amountSpentLabel: 'Amount spent',
  remainingBudgetLabel: 'Remaining',
  startDateLabel: 'Start date',
  endDateLabel: 'End date',
  daysRemainingLabel: 'Days remaining',
  performanceSection: 'Performance',
  impressionsLabel: 'Impressions',
  clicksLabel: 'Clicks',
  ctrLabel: 'CTR',
  costPerClickLabel: 'Cost per click',
  attributedStreamsLabel: 'Attributed streams',
  attributedStreamsHint: "Part of the track's total streams — see Analytics",
  costPerStreamLabel: 'Cost per stream',
  costPerFollowerLabel: 'Cost per follower',
  attributedPlaylistsLabel: 'Attributed playlist adds',
  dailyPerformanceEyebrow: 'DAILY PERFORMANCE',
  dailyPerformanceHeadline: 'Daily performance',
  budgetSpendEyebrow: 'BUDGET',
  budgetSpendHeadline: 'Budget spend',
  period14d: '14 days',
  period30d: '30 days',
  periodLifetime: 'Lifetime',
  campaignAudienceHeadline: 'Campaign audience',
  progressLabel: 'Progress',
  campaignPaused: 'Paused',
  pauseCampaignCta: 'Pause campaign',
  resumeCampaignCta: 'Resume campaign',
  pauseConfirmTitle: 'Pause this campaign?',
  pauseConfirmBody: 'Delivery will stop until you resume it.',
  resumeConfirmTitle: 'Resume this campaign?',
  resumeConfirmBody: 'Delivery will continue from where it left off.',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  campaignNotFoundTitle: 'Campaign not found',
  backToPromotion: 'Back to Promotion',
  noCampaignsForFilter: 'No campaigns match this filter.',
```

- [ ] **Step 2: Add the RU mirrors to `RU_STRINGS`**

In the same file, inside `RU_STRINGS`, directly before the closing `};`, add:

```ts
  campaignDetailsTitle: 'Детали кампании',
  campaignOverviewSection: 'Обзор кампании',
  totalBudgetLabel: 'Общий бюджет',
  amountSpentLabel: 'Потрачено',
  remainingBudgetLabel: 'Остаток',
  startDateLabel: 'Дата начала',
  endDateLabel: 'Дата окончания',
  daysRemainingLabel: 'Осталось дней',
  performanceSection: 'Эффективность',
  impressionsLabel: 'Показы',
  clicksLabel: 'Клики',
  ctrLabel: 'CTR (кликабельность)',
  costPerClickLabel: 'Цена за клик',
  attributedStreamsLabel: 'Привязанные прослушивания',
  attributedStreamsHint: 'Часть общих прослушиваний трека — см. Аналитику',
  costPerStreamLabel: 'Цена за прослушивание',
  costPerFollowerLabel: 'Цена за подписчика',
  attributedPlaylistsLabel: 'Привязанные добавления в плейлисты',
  dailyPerformanceEyebrow: 'ЕЖЕДНЕВНАЯ ЭФФЕКТИВНОСТЬ',
  dailyPerformanceHeadline: 'Показатели по дням',
  budgetSpendEyebrow: 'БЮДЖЕТ',
  budgetSpendHeadline: 'Расход бюджета',
  period14d: '14 дней',
  period30d: '30 дней',
  periodLifetime: 'За всё время',
  campaignAudienceHeadline: 'Аудитория кампании',
  progressLabel: 'Прогресс',
  campaignPaused: 'На паузе',
  pauseCampaignCta: 'Приостановить кампанию',
  resumeCampaignCta: 'Возобновить кампанию',
  pauseConfirmTitle: 'Приостановить эту кампанию?',
  pauseConfirmBody: 'Показ остановится до возобновления.',
  resumeConfirmTitle: 'Возобновить эту кампанию?',
  resumeConfirmBody: 'Показ продолжится с того же места.',
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  campaignNotFoundTitle: 'Кампания не найдена',
  backToPromotion: 'Назад к продвижению',
  noCampaignsForFilter: 'Нет кампаний по этому фильтру.',
```

- [ ] **Step 3: Run the i18n verify script**

Run: `cd apps/mobile && npx tsx scripts/verify-dashboard-i18n.mjs`
Expected: `All dashboard-i18n checks passed.` This specifically re-confirms every new key exists in both languages and the two values differ (the `ctrLabel` RU value was deliberately written as "CTR (кликабельность)" rather than a bare "CTR" for exactly this reason).

- [ ] **Step 4: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
cd apps/mobile
git add src/lib/dashboard-i18n.ts
git commit -m "feat: add EN/RU strings for Campaign Details"
```

---

## Task 5: Campaign Details screen

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/[id].tsx`

**Interfaces:**
- Consumes: `getCampaignAnalytics`, `CampaignPeriod` (Task 2); `pauseCampaign`, `resumeCampaign`, `campaigns`, `entries` from `useArtistStore` (Task 3); all new i18n keys (Task 4); `ListenTrendChart` (existing, unmodified); `PromoGoal`, `GOAL_LABEL`-equivalent mapping (mirrors `promotion.tsx`'s own `GOAL_LABEL`).
- Produces: the route `/profile/artist/campaign/[id]` — consumed by Task 6's navigation wiring.

- [ ] **Step 1: Create the route file**

Create `apps/mobile/src/app/profile/artist/campaign/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, Chip, EmptyState, PillButton, StatCard, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getCampaignAnalytics, type CampaignPeriod } from '@/lib/campaign-analytics-mock';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { formatKgsAmount } from '@/lib/format-currency';
import type { PromoGoal } from '@/lib/promotion';
import { useArtistStore } from '@/state/artist-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const GOAL_LABEL: Record<PromoGoal, DashboardStringKey> = { streams: 'goalStreams', followers: 'goalFollowers', playlists: 'goalPlaylists' };

const PERIOD_KEYS: { id: CampaignPeriod; key: DashboardStringKey }[] = [
  { id: '7d', key: 'period7d' },
  { id: '14d', key: 'period14d' },
  { id: '30d', key: 'period30d' },
  { id: 'lifetime', key: 'periodLifetime' },
];

/** Artist Dashboard — Campaign Details (Promotion → tap a campaign). Every
 * performance figure is deterministic mock data derived from the campaign's
 * own stored fields (lib/campaign-analytics-mock.ts) — never real ad
 * delivery, never a real MBANK charge beyond the campaign's original
 * simulated payment. */
export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useDashboardStrings();
  const campaigns = useArtistStore((s) => s.campaigns);
  const entries = useArtistStore((s) => s.entries);
  const pauseCampaign = useArtistStore((s) => s.pauseCampaign);
  const resumeCampaign = useArtistStore((s) => s.resumeCampaign);

  const [period, setPeriod] = useState<CampaignPeriod>('lifetime');
  const [confirming, setConfirming] = useState<'pause' | 'resume' | undefined>();

  const campaign = campaigns.find((c) => c.id === id);
  const coverUri = entries.find((e) => e.track.id === campaign?.trackId)?.track.coverUri;

  const analytics = useMemo(() => (campaign ? getCampaignAnalytics(campaign, period) : undefined), [campaign, period]);

  if (!campaign || !analytics) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <View style={styles.content}>
          <EmptyState icon="campaign" title={t('campaignNotFoundTitle')} />
          <TextLinkButton label={t('backToPromotion')} onPress={() => router.replace('/profile/artist/dashboard/promotion')} style={styles.notFoundLink} />
        </View>
      </ThemedView>
    );
  }

  const done = campaign.status === 'completed';
  const statusLabel = campaign.status === 'active' ? t('campaignActive') : campaign.status === 'paused' ? t('campaignPaused') : t('campaignCompleted');
  const statusColor = campaign.status === 'active' ? Colors.tertiary : campaign.status === 'paused' ? Colors.secondary : Colors.text.medium;

  const startDate = new Date(campaign.createdAt);
  const endDate = new Date(startDate.getTime() + campaign.durationDays * 86_400_000);
  const dateFmt = (d: Date) => d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });

  function handlePause() {
    pauseCampaign(campaign!.id);
    setConfirming(undefined);
  }
  function handleResume() {
    resumeCampaign(campaign!.id);
    setConfirming(undefined);
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText variant="headline-sm" style={styles.flexText}>{t('campaignOverviewSection')}</ThemedText>
            <Badge label={t('demoDataBadge')} />
          </View>
          <View style={styles.trackRow}>
            <Artwork uri={coverUri} size={56} radius={Radii.DEFAULT} />
            <View style={styles.flexText}>
              <ThemedText variant="headline-md" numberOfLines={1}>{campaign.trackTitle}</ThemedText>
              <ThemedText variant="body-sm" emphasis="medium">{t(GOAL_LABEL[campaign.goal])}</ThemedText>
            </View>
            <ThemedText variant="label-md" style={{ color: statusColor }}>{statusLabel}</ThemedText>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${analytics.progressPct}%` }]} />
          </View>
          <View style={styles.statsRow}>
            <ThemedText variant="body-sm" emphasis="medium">{t('progressLabel')}: {analytics.progressPct}%</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">{t('daysRemainingLabel')}: {analytics.daysRemaining}</ThemedText>
          </View>

          <InfoLine label={t('totalBudgetLabel')} value={`${formatKgsAmount(campaign.budgetKgs)} сом`} />
          <InfoLine label={t('amountSpentLabel')} value={`${formatKgsAmount(analytics.spentKgs)} сом`} />
          <InfoLine label={t('remainingBudgetLabel')} value={`${formatKgsAmount(analytics.remainingBudgetKgs)} сом`} />
          <InfoLine label={t('startDateLabel')} value={dateFmt(startDate)} />
          <InfoLine label={t('endDateLabel')} value={dateFmt(endDate)} />
        </View>

        <View style={styles.card}>
          <ThemedText variant="headline-sm">{t('performanceSection')}</ThemedText>
          <View style={styles.statsGrid}>
            <StatCard label={t('impressionsLabel')} value={analytics.impressions.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('campaignReach')} value={campaign.reachSoFar.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('clicksLabel')} value={analytics.clicks.toLocaleString('en-US')} style={styles.statTile} />
            <StatCard label={t('ctrLabel')} value={`${analytics.ctrPct}%`} style={styles.statTile} />
            <StatCard label={t('costPerClickLabel')} value={`${formatKgsAmount(analytics.costPerClickKgs)} сом`} style={styles.statTile} />
            {campaign.goal === 'streams' && (
              <>
                <StatCard label={t('attributedStreamsLabel')} value={analytics.attributedStreams.toLocaleString('en-US')} style={styles.statTile} />
                <StatCard label={t('costPerStreamLabel')} value={`${formatKgsAmount(analytics.costPerAttributedStreamKgs)} сом`} style={styles.statTile} />
              </>
            )}
            {campaign.goal === 'followers' && (
              <>
                <StatCard label={t('newFollowersLabel')} value={analytics.attributedNewFollowers.toLocaleString('en-US')} style={styles.statTile} />
                <StatCard label={t('costPerFollowerLabel')} value={`${formatKgsAmount(analytics.costPerFollowerKgs)} сом`} style={styles.statTile} />
              </>
            )}
            {campaign.goal === 'playlists' && (
              <StatCard label={t('attributedPlaylistsLabel')} value={analytics.attributedPlaylistAdds.toLocaleString('en-US')} style={styles.statTile} />
            )}
          </View>
          {campaign.goal === 'streams' && <ThemedText variant="body-sm" emphasis="medium">{t('attributedStreamsHint')}</ThemedText>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIOD_KEYS.map((p) => (
            <Chip key={p.id} label={t(p.key)} selected={p.id === period} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('dailyPerformanceEyebrow')}</ThemedText>
          <ThemedText variant="headline-sm">{t('dailyPerformanceHeadline')}</ThemedText>
          <ListenTrendChart
            points={analytics.dailyPerformance}
            peakLabel={`${t('peakLabel')} ${Math.max(...analytics.dailyPerformance.map((p) => p.value)).toLocaleString('en-US')}`}
          />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('budgetSpendEyebrow')}</ThemedText>
          <ThemedText variant="headline-sm">{t('budgetSpendHeadline')}</ThemedText>
          <ListenTrendChart points={analytics.dailySpend} peakLabel={`${t('peakLabel')} ${formatKgsAmount(analytics.spentKgs)} сом`} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>{t('audienceSection')}</ThemedText>
          <ThemedText variant="headline-sm">{t('campaignAudienceHeadline')}</ThemedText>
          {analytics.audience.topCountries.map((c) => (
            <View key={c.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{c.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{c.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('topCities')}</ThemedText>
          {analytics.audience.topCities.map((c) => (
            <View key={c.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{c.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{c.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('ageGroups')}</ThemedText>
          {analytics.audience.ageGroups.map((g) => (
            <View key={g.label.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{g.label[locale]}</ThemedText>
              <ThemedText variant="label-lg">{g.pct}%</ThemedText>
            </View>
          ))}
          <ThemedText variant="headline-sm" style={styles.subHead}>{t('listeningDevices')}</ThemedText>
          {analytics.audience.devices.map((d) => (
            <View key={d.name.en} style={styles.barRow}>
              <ThemedText variant="body-sm">{d.name[locale]}</ThemedText>
              <ThemedText variant="label-lg">{d.pct}%</ThemedText>
            </View>
          ))}
        </View>

        {!done && (
          <View style={styles.card}>
            {confirming ? (
              <>
                <ThemedText variant="headline-sm">{confirming === 'pause' ? t('pauseConfirmTitle') : t('resumeConfirmTitle')}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{confirming === 'pause' ? t('pauseConfirmBody') : t('resumeConfirmBody')}</ThemedText>
                <View style={styles.confirmRow}>
                  <TextLinkButton label={t('cancelLabel')} tone="muted" onPress={() => setConfirming(undefined)} />
                  <PillButton label={t('confirmLabel')} onPress={confirming === 'pause' ? handlePause : handleResume} />
                </View>
              </>
            ) : campaign.status === 'active' ? (
              <PillButton label={t('pauseCampaignCta')} leadingIcon="pause-circle-outline" onPress={() => setConfirming('pause')} />
            ) : (
              <PillButton label={t('resumeCampaignCta')} leadingIcon="play-circle-outline" onPress={() => setConfirming('resume')} />
            )}
          </View>
        )}

        <TextLinkButton label={t('backToPromotion')} onPress={() => router.replace('/profile/artist/dashboard/promotion')} style={styles.backLink} />
      </ScrollView>
    </ThemedView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <ThemedText variant="body-sm" emphasis="medium" style={styles.flexText} numberOfLines={1}>{label}</ThemedText>
      <ThemedText variant="label-lg">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  notFoundLink: { alignSelf: 'center', marginTop: Spacing.sm },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: { flexBasis: '47%' },
  filterRow: { gap: Spacing.xs },
  chartCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  subHead: { marginTop: Spacing.sm },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  backLink: { alignSelf: 'center' },
});
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean). If `PillButton`'s `leadingIcon` prop or `TextLinkButton`'s `tone` prop don't match, check their exact prop names in `src/components/ui/button.tsx` and adjust — these are assumed from existing call sites in `promote.tsx` and `dashboard/index.tsx`.

- [ ] **Step 3: Manual smoke test — not-found state**

This route can't be meaningfully unit-tested (it's a full screen reading live Zustand state), so verify it directly once Task 6 wires navigation into it (see Task 7's browser walkthrough for the full pass). For now, confirm the file compiles and exports a default component via the type-check above.

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add src/app/profile/artist/campaign/[id].tsx
git commit -m "feat: Campaign Details screen"
```

---

## Task 6: Wire Promotion tab into Campaign Details

**Files:**
- Modify: `apps/mobile/src/app/profile/artist/dashboard/promotion.tsx`

**Interfaces:**
- Consumes: the `/profile/artist/campaign/[id]` route (Task 5); `campaignPaused`, `filterAll`, `noCampaignsForFilter` i18n keys (Task 4).
- Produces: nothing new consumed elsewhere — this is the final UI wiring task.

- [ ] **Step 1: Update imports**

In `apps/mobile/src/app/profile/artist/dashboard/promotion.tsx`, change:

```ts
import { useMemo } from 'react';
```
to:
```ts
import { useMemo, useState } from 'react';
```

and change:
```ts
import { Artwork, Badge, PillButton } from '@/components/ui';
```
to:
```ts
import { Artwork, Badge, Chip, EmptyState, PillButton, PressableScale } from '@/components/ui';
```

- [ ] **Step 2: Add the campaign status filter**

Directly after the `GOAL_LABEL` constant, add:

```ts
type CampaignFilter = 'all' | 'active' | 'paused' | 'completed';
const CAMPAIGN_FILTERS: { id: CampaignFilter; key: DashboardStringKey }[] = [
  { id: 'all', key: 'filterAll' },
  { id: 'active', key: 'campaignActive' },
  { id: 'paused', key: 'campaignPaused' },
  { id: 'completed', key: 'campaignCompleted' },
];
```

- [ ] **Step 3: Make the active-campaign hero card pressable**

Change:
```tsx
        {active && (
          <View style={styles.card}>
```
to:
```tsx
        {active && (
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/profile/artist/campaign/[id]', params: { id: active.id } })}
            style={styles.card}
          >
```
and change its closing tag from `</View>` to `</PressableScale>` (it's the first `</View>` that closes this block — the one matching the `<View style={styles.card}>` opened above, i.e. the one right before the following blank line and `<View style={styles.section}>`).

- [ ] **Step 4: Add the filter state and filtered list**

In the component body, directly after `const active = campaigns.find((c) => c.status === 'active');`, add:

```ts
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const filteredCampaigns = useMemo(() => (filter === 'all' ? campaigns : campaigns.filter((c) => c.status === filter)), [campaigns, filter]);
```

Then replace the existing block:
```tsx
        {campaigns.length > 0 && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('campaignsSection')}</ThemedText>
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} coverUri={coverOf(c.trackId)} />
            ))}
          </View>
        )}
```
with:
```tsx
        {campaigns.length > 0 && (
          <View style={styles.section}>
            <ThemedText variant="headline-md">{t('campaignsSection')}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CAMPAIGN_FILTERS.map((f) => (
                <Chip key={f.id} label={t(f.key)} selected={f.id === filter} onPress={() => setFilter(f.id)} />
              ))}
            </ScrollView>
            {filteredCampaigns.length === 0 ? (
              <EmptyState icon="campaign" title={t('noCampaignsForFilter')} />
            ) : (
              filteredCampaigns.map((c) => <CampaignRow key={c.id} campaign={c} coverUri={coverOf(c.trackId)} />)
            )}
          </View>
        )}
```

- [ ] **Step 5: Make `CampaignRow` pressable and support the `paused` status**

Replace the whole `CampaignRow` function with:

```tsx
function CampaignRow({ campaign: c, coverUri }: { campaign: Campaign; coverUri?: Parameters<typeof Artwork>[0]['uri'] }) {
  const { t } = useDashboardStrings();
  const statusLabel = c.status === 'completed' ? t('campaignCompleted') : c.status === 'paused' ? t('campaignPaused') : t('campaignActive');
  const statusColor = c.status === 'completed' ? Colors.text.medium : c.status === 'paused' ? Colors.secondary : Colors.tertiary;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/profile/artist/campaign/[id]', params: { id: c.id } })}
      style={styles.historyCard}
    >
      <View style={styles.activeRow}>
        <Artwork uri={coverUri} size={40} radius={Radii.DEFAULT} />
        <View style={styles.flexText}>
          <ThemedText variant="label-lg" numberOfLines={1}>{c.trackTitle}</ThemedText>
          <ThemedText variant="body-sm" emphasis="medium">
            {t(GOAL_LABEL[c.goal])} · {formatKgsAmount(c.budgetKgs)} сом · {c.durationDays} {t('daysWord')}
          </ThemedText>
        </View>
        <ThemedText variant="label-md" style={{ color: statusColor }}>{statusLabel}</ThemedText>
      </View>
      <View style={styles.statsRow}>
        <ThemedText variant="body-sm" emphasis="medium">
          {t('campaignReach')}: {c.reachSoFar.toLocaleString('en-US')} / {c.estimatedReach.toLocaleString('en-US')}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {c.simulatedPayment ? t('paidViaMbankDemo') : ''} · {c.paymentRef}
        </ThemedText>
      </View>
    </PressableScale>
  );
}
```

- [ ] **Step 6: Add the `filterRow` style**

In the `StyleSheet.create` block, add:
```ts
  filterRow: { gap: Spacing.xs },
```

- [ ] **Step 7: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 8: Commit**

```bash
cd apps/mobile
git add src/app/profile/artist/dashboard/promotion.tsx
git commit -m "feat: navigate Promotion campaigns into Campaign Details, add status filter"
```

---

## Task 7: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run every verify script and confirm nothing regressed**

```bash
cd apps/mobile
for f in scripts/verify-*.mjs; do
  out=$(npx tsx "$f" 2>&1); code=$?
  if [ $code -ne 0 ]; then echo "=== FAIL: $f ==="; echo "$out" | tail -15; fi
done
echo DONE
```
Expected: the only failure, if any, is the pre-existing unrelated `verify-static-pages.mjs` (stale `dist/` export, documented in the previous session as unrelated to the Artist Dashboard).

- [ ] **Step 2: Restart the dev server**

The worktree's Metro does not hot-reload edits under `.worktrees/`. Restart it with `--clear`:

```bash
kill $(lsof -tiTCP:9400 -sTCP:LISTEN) 2>/dev/null
cd apps/mobile && nohup npx expo start --web --port 9400 --clear > /tmp/mmusic-9400.log 2>&1 &
```
Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:9400` to return `200`, then tail `/tmp/mmusic-9400.log` to confirm it bundled without errors.

- [ ] **Step 3: Browser walkthrough (claude-in-chrome)**

Navigate to `http://localhost:9400/dev-demo-seed`, load the demo account, then:
1. Dashboard → Promotion: confirm the active campaign hero card and all campaign rows are now tappable, each opens Campaign Details.
2. Open "Night Train to Osh" (active): confirm overview card, performance stat grid (with `attributedStreamsHint` footnote since its goal is `streams`), daily performance + budget spend charts render, period chips (7d/14d/30d/lifetime) change the chart data, audience card renders with percentages summing to 100, Pause button present.
3. Tap Pause → inline confirm appears → Confirm → status badge changes to "Paused" / "На паузе", Resume button now shows.
4. Tap Resume → inline confirm → Confirm → back to "Active".
5. Go back to Promotion, apply each status filter chip (All/Active/Paused/Completed) — confirm the list updates and a status with 0 matches shows the empty state, not a blank gap.
6. Open "Issyk Blue" or "Steppe Lights" (completed): confirm no Pause/Resume controls render at all.
7. Manually navigate to `http://localhost:9400/profile/artist/campaign/does-not-exist` — confirm the "Campaign not found" empty state renders, with a working "Back to Promotion" link, no crash.
8. Switch locale to English (if a language toggle exists in this build) or re-check Russian strings render correctly throughout — confirm no missing-translation fallbacks.
9. Resize the browser to a narrow (mobile) width and re-check Campaign Details and the updated Promotion screen — confirm layout doesn't break.
10. Re-check Overview, Analytics, and Studio Pro tabs are visually unchanged from before this plan.
11. Check the browser console for errors across all of the above (`read_console_messages` with `onlyErrors: true`).

- [ ] **Step 4: Dispatch an independent code reviewer**

Per `superpowers:requesting-code-review`, dispatch a `general-purpose` subagent to review the working-tree diff (or the range of commits made in Tasks 1–6, via `git log` on this branch) against this plan and its spec. Fix any Critical/Important findings before reporting done; Minor findings are a judgment call.

- [ ] **Step 5: Report to the user**

Summarize what was built, the preview URL, and explicitly note nothing has been committed beyond the per-task commits already made in this worktree (still not merged, pushed, or deployed) — wait for visual approval before any further action.
