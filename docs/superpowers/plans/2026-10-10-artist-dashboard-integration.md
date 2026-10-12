# Artist Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Artist Dashboard's Analytics, Promotion, and Studio Pro screens (from Stitch exports `midnight_mirage/`, `mmusic_boost/`, `mmusic_studio/`) plus an adapted Overview tab, as a separate tabbed workspace reachable from the existing Profile entry point, entirely frontend/mock-data, with zero changes to Home/Search/Library/Player.

**Architecture:** A new, self-contained Expo Router nested navigator at `profile/artist/dashboard/` — its own `<Tabs>` + its own tab-bar component (not `FloatingTabBar`), four screens (Overview/Analytics/Promotion/Studio Pro). A new pure-function mock-data layer (`lib/analytics-mock.ts`, `mocks/promotions.ts`) drives all numbers and the trend chart, so time-period/track selection changes are real state changes, not static copy. The trend chart is a small `react-native-svg`-based component — no new charting dependency.

**Tech Stack:** Expo Router (`<Tabs>`), `react-native-svg` (already a dependency), existing design-system primitives (`StatCard`, `Chip`, `PillButton`, `Artwork`, `EmptyState`, `IconButton`, `PressableScale`), `formatKgsAmount()`.

**Spec:** This plan document is also its own spec — built directly from live inspection of `stitch_mmusic_mobile_streaming_app/{midnight_mirage,mmusic_boost,mmusic_studio}/code.html` + `screen.png`, the existing `src/app/profile/artist/dashboard.tsx`, `src/state/artist-store.ts`, `src/components/nav/floating-tab-bar.tsx` (the pattern this plan's new tab bar follows), and `docs/mmusic-task-tracker.md` (G-1..G-5).

## Global Constraints

- Frontend-only. No backend/API changes. No real payments, subscriptions, or live promo campaigns — every monetary CTA is real-looking but explicitly disabled with an honest label, exactly like the existing Support flow's pattern.
- No new npm dependencies. `react-native-svg@15.15.5` (already installed) covers the chart; icons map through the existing `Icon` component's documented Material-Symbols-name convention; fonts (Inter, Plus Jakarta Sans) are already loaded.
- Stage 2 stays paused. Home, Search, Library, Player, `FloatingTabBar`, `MiniPlayer` are not touched by any task in this plan.
- **Localization — resolved by user decision (2026-10-10):** English stays the default, but every new Dashboard screen must also support Russian. **Important factual correction:** there is no existing project-wide localization system in the codebase yet — `docs/mmusic-task-tracker.md` H-1 (i18next infrastructure) is still `TODO`/`BLOCKED`, gated behind a separate dependency-install approval (OQ-58's architecture is only planned, never built). Since this same approval also says "do not introduce unnecessary dependencies," this plan does **not** install i18next now. Instead, Task 4 (new, below) builds a small, dependency-free EN/RU string-table + a Dashboard-scoped locale store, consumed by every Dashboard screen — forward-compatible in shape with a future i18next migration (same key names, same `t(key)` call shape), but entirely local to this feature and zero new packages. Flag if you'd rather this wait for the real Phase 5 infrastructure instead.
- **Overview source — confirmed, not just assumed:** live inspection of all three user-specified Stitch folders (`midnight_mirage`, `mmusic_boost`, `mmusic_studio`) confirms none renders "Overview" as the active tab under the new (Overview/Analytics/Promotion/Studio Pro) bar — only `artist_dashboard_mmusic` (outside the specified set) does, under the old, already-rejected (Catalog/Payouts) bar. Per the user's explicit instruction, Overview reuses/adapts the existing, already-implemented `dashboard.tsx` content, re-skinned under the new tab bar — not a new design.
- **Studio Pro FAQ — included per user decision:** the FAQ accordion from `mmusic_studio` ("Частые вопросы" — two questions on plan changes/cancellation and payout security/speed) is now in scope for Task 8 (renumbered), with real expand/collapse state, not a static list.
- Desktop/responsive: the app already centers every screen to a fixed phone-width column on wide viewports (`_layout.tsx`'s `appColumn` style, `MAX_CONTENT_WIDTH`). No new breakpoint logic is needed — these screens inherit that behavior automatically by living inside the same root `Stack`.
- KGS amounts always go through `formatKgsAmount()` (Phase 0 precedent).
- Mock data is clearly data — comments state it's mock, consistent with the project's "honest data" principle used throughout (e.g. `dashboard.tsx`'s own comment: "a brand-new local artist genuinely has 0 listeners/streams... so 0 is the honest value").

## Review Focus

- Switching the Analytics time-period filter (24h/7d/28d/All time) must actually change every displayed number (streams, listeners, chart points, peak) — not just the active-chip styling. A reviewer should try this and confirm numbers differ per period, deterministically (same period re-selected shows the same numbers, not reshuffled).
- Promotion's "create campaign" track selector must actually change which track's name/art is shown in the form — not a decorative dropdown with no state.
- Translated English strings (replacing the Russian mockup copy) must not overflow the fixed-width stat tiles/chips — several of Stitch's Russian labels are short ("Стримы", "Слушатели") and their English equivalents may run longer ("Streams" is fine, but check the geography/channel rows at narrow widths).
- Every disabled monetary CTA (Studio PRO subscribe, Label & Team, Launch via MBANK) needs an honest `accessibilityLabel`/toast matching the Support-flow precedent — a reviewer should tap each one and confirm it never silently does nothing with no feedback.
- The chart's SVG path must render sanely for every mock time-period's point count (24h likely has fewer points than 28-day) — a reviewer should check it doesn't collapse to a flat/broken line at the smallest dataset.
- Switching the Dashboard's EN/RU locale toggle must relabel every static string across all four tabs, not just the screen it was toggled on — a reviewer should toggle to Russian on Overview, then navigate to Analytics/Promotion/Studio Pro and confirm they're already in Russian too (shared store, not per-screen local state).
- The Studio Pro FAQ accordion's expand/collapse must be real per-item state (expanding one question doesn't expand/collapse the others), and both Russian and English copy must fit without being cut off.

---

### Task 1: Analytics mock-data layer

**Files:**
- Create: `apps/mobile/src/lib/analytics-mock.ts`
- Test: `apps/mobile/scripts/verify-analytics-mock.mjs`

**Interfaces:**
- Produces: `type TimePeriod = '24h' | '7d' | '28d' | 'all'`; `type TrendPoint = { label: string; value: number }`; `type TrackAnalytics = { streams: number; streamsDeltaPct: number; listeners: number; listenersDeltaPct: number; completionPct: number; completionLabel: string; playlistAdds: number; playlistAddsDelta: number; trend: TrendPoint[]; peak: number; peakLabel: string; avgListenSec: number; avgListenPct: number; geography: { city: string; country: string; pct: number }[]; channels: { name: string; pct: number }[] }`; function `getTrackAnalytics(trackId: string, period: TimePeriod): TrackAnalytics` — pure, deterministic (same `trackId`+`period` always returns the same object), used by Task 6 (Analytics screen).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-analytics-mock.mjs
#!/usr/bin/env node
/**
 * Mock analytics data: deterministic per track+period, internally consistent
 * (percentages sum to 100, peak matches the trend's real max).
 * Usage: npx tsx scripts/verify-analytics-mock.mjs
 */
import { getTrackAnalytics } from '../src/lib/analytics-mock.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const a = getTrackAnalytics('midnight-mirage', '28d');
const b = getTrackAnalytics('midnight-mirage', '28d');
check('same track+period is deterministic (same numbers every call)', JSON.stringify(a) === JSON.stringify(b));

const c = getTrackAnalytics('midnight-mirage', '7d');
check('a different period gives a different trend', JSON.stringify(a.trend) !== JSON.stringify(c.trend));

const d = getTrackAnalytics('horizon', '28d');
check('a different track gives different numbers for the same period', a.streams !== d.streams);

check('streams/listeners/playlistAdds are positive integers', Number.isInteger(a.streams) && a.streams > 0 && Number.isInteger(a.listeners) && a.listeners > 0 && Number.isInteger(a.playlistAdds) && a.playlistAdds > 0);
check('completionPct is between 0 and 100', a.completionPct > 0 && a.completionPct <= 100);
check('geography percentages sum to 100', Math.round(a.geography.reduce((sum, g) => sum + g.pct, 0)) === 100);
check('channel percentages sum to 100', Math.round(a.channels.reduce((sum, c2) => sum + c2.pct, 0)) === 100);
check('peak equals the real maximum of the trend values', a.peak === Math.max(...a.trend.map((p) => p.value)));
check('trend has at least 2 points for every period', ['24h', '7d', '28d', 'all'].every((p) => getTrackAnalytics('midnight-mirage', p).trend.length >= 2));
check('avgListenSec is positive and avgListenPct is 0-100', a.avgListenSec > 0 && a.avgListenPct > 0 && a.avgListenPct <= 100);

if (failures > 0) {
  console.error(`\n${failures} analytics-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll analytics-mock checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-analytics-mock.mjs`
Expected: FAIL — `Cannot find module '../src/lib/analytics-mock.ts'`.

- [ ] **Step 3: Write `analytics-mock.ts`**

```ts
// apps/mobile/src/lib/analytics-mock.ts
/**
 * Deterministic mock analytics (Artist Dashboard Analytics). No real
 * telemetry exists — every number here is seeded from the track id and
 * period so the same selection always shows the same figures, and
 * different selections visibly differ, without ever being random noise
 * on re-render.
 */
export type TimePeriod = '24h' | '7d' | '28d' | 'all';

export type TrendPoint = { label: string; value: number };

export type TrackAnalytics = {
  streams: number;
  streamsDeltaPct: number;
  listeners: number;
  listenersDeltaPct: number;
  completionPct: number;
  completionLabel: 'Low' | 'Average' | 'High';
  playlistAdds: number;
  playlistAddsDelta: number;
  trend: TrendPoint[];
  peak: number;
  peakLabel: string;
  avgListenSec: number;
  avgListenPct: number;
  geography: { city: string; country: string; pct: number }[];
  channels: { name: string; pct: number }[];
};

const PERIOD_POINTS: Record<TimePeriod, number> = { '24h': 6, '7d': 7, '28d': 10, all: 12 };
const PERIOD_BASE: Record<TimePeriod, number> = { '24h': 1200, '7d': 9000, '28d': 42000, all: 180000 };

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

export function getTrackAnalytics(trackId: string, period: TimePeriod): TrackAnalytics {
  const rand = mulberry32(seedFrom(trackId, period));
  const points = PERIOD_POINTS[period];
  const base = PERIOD_BASE[period];

  let trendValue = base * 0.3;
  const trend: TrendPoint[] = Array.from({ length: points }, (_, i) => {
    trendValue = Math.max(10, trendValue + (rand() - 0.35) * base * 0.25);
    return { label: `P${i + 1}`, value: Math.round(trendValue) };
  });
  const peak = Math.max(...trend.map((p) => p.value));

  const streams = Math.round(base * (1.4 + rand() * 0.6));
  const listeners = Math.round(streams * (0.45 + rand() * 0.15));
  const completionPct = Math.round(60 + rand() * 35);
  const playlistAdds = Math.round(streams * 0.02 * (0.5 + rand()));

  const geoRaw = [0.3 + rand() * 0.3, 0.15 + rand() * 0.2, 0.08 + rand() * 0.15];
  const geoSum = geoRaw.reduce((s, v) => s + v, 0);
  const geoPcts = geoRaw.map((v) => Math.round((v / geoSum) * 87));
  const lastGeo = 100 - geoPcts.reduce((s, v) => s + v, 0);

  const chanRaw = [0.4 + rand() * 0.2, 0.2 + rand() * 0.15, 0.1 + rand() * 0.1];
  const chanSum = chanRaw.reduce((s, v) => s + v, 0);
  const chanPcts = chanRaw.map((v) => Math.round((v / chanSum) * 94));
  const lastChan = 100 - chanPcts.reduce((s, v) => s + v, 0);

  return {
    streams,
    streamsDeltaPct: Math.round((8 + rand() * 15) * 10) / 10,
    listeners,
    listenersDeltaPct: Math.round((5 + rand() * 12) * 10) / 10,
    completionPct,
    completionLabel: completionPct >= 80 ? 'High' : completionPct >= 60 ? 'Average' : 'Low',
    playlistAdds,
    playlistAddsDelta: Math.round(playlistAdds * 0.08),
    trend,
    peak,
    peakLabel: trend.find((p) => p.value === peak)?.label ?? trend[trend.length - 1]!.label,
    avgListenSec: Math.round(180 + rand() * 90),
    avgListenPct: Math.round(70 + rand() * 20),
    geography: [
      { city: 'Bishkek', country: 'Kyrgyzstan', pct: geoPcts[0]! },
      { city: 'Almaty', country: 'Kazakhstan', pct: geoPcts[1]! },
      { city: 'Osh', country: 'Kyrgyzstan', pct: geoPcts[2]! },
      { city: 'Other cities', country: 'Global', pct: lastGeo },
    ],
    channels: [
      { name: 'Mmusic For You', pct: chanPcts[0]! },
      { name: 'Playlists', pct: chanPcts[1]! },
      { name: 'Artist Search', pct: chanPcts[2]! },
      { name: 'Track Radio', pct: lastChan },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-analytics-mock.mjs`
Expected: PASS, "All analytics-mock checks passed."

- [ ] **Step 5: Add the script to the test chain**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-analytics-mock.mjs` to the `"test"` chain, and add `"verify:analytics-mock": "tsx scripts/verify-analytics-mock.mjs"`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/analytics-mock.ts apps/mobile/scripts/verify-analytics-mock.mjs apps/mobile/package.json
git commit -m "feat(dashboard): deterministic mock analytics data layer"
```

---

### Task 2: Promotion mock-data layer

**Files:**
- Create: `apps/mobile/src/mocks/promotions.ts`
- Test: `apps/mobile/scripts/verify-promotions-mock.mjs`

**Interfaces:**
- Produces: `type PromoTool = { id: string; name: string; priceLabel: string; description: string; badge?: string }`; `type ActiveCampaign = { trackId: string; dayOfTotal: string; reach: number; reachGoal: number; conversionRatePct: number; newFollowers: number; progressPct: number }`; `type CampaignHistoryEntry = { id: string; trackTitle: string; metric: string; completedLabel: string; reach: number }`; consts `PROMO_TOOLS: PromoTool[]`, `ACTIVE_CAMPAIGN: ActiveCampaign`, `CAMPAIGN_HISTORY: CampaignHistoryEntry[]` — consumed by Task 7 (Promotion screen).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-promotions-mock.mjs
#!/usr/bin/env node
/**
 * Promotion mock data: shape and invariant checks (mock campaign/tool data,
 * Artist Dashboard Promotion tab). Usage: npx tsx scripts/verify-promotions-mock.mjs
 */
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_TOOLS } from '../src/mocks/promotions.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('at least 3 promo tools, matching the Stitch mockup', PROMO_TOOLS.length >= 3);
check('every promo tool has a non-empty name, priceLabel, and description', PROMO_TOOLS.every((t) => t.name.length > 0 && t.priceLabel.length > 0 && t.description.length > 0));
check('every promo tool has a unique id', new Set(PROMO_TOOLS.map((t) => t.id)).size === PROMO_TOOLS.length);

check('active campaign reach never exceeds its goal in the mock (honest progress)', ACTIVE_CAMPAIGN.reach <= ACTIVE_CAMPAIGN.reachGoal);
check('active campaign progressPct matches reach/reachGoal', Math.round((ACTIVE_CAMPAIGN.reach / ACTIVE_CAMPAIGN.reachGoal) * 1000) / 10 === ACTIVE_CAMPAIGN.progressPct);
check('active campaign references a real catalog track id', typeof ACTIVE_CAMPAIGN.trackId === 'string' && ACTIVE_CAMPAIGN.trackId.length > 0);

check('at least 2 history entries', CAMPAIGN_HISTORY.length >= 2);
check('every history entry has a unique id', new Set(CAMPAIGN_HISTORY.map((h) => h.id)).size === CAMPAIGN_HISTORY.length);
check('every history entry has a positive reach', CAMPAIGN_HISTORY.every((h) => h.reach > 0));

if (failures > 0) {
  console.error(`\n${failures} promotions-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll promotions-mock checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-promotions-mock.mjs`
Expected: FAIL — `Cannot find module '../src/mocks/promotions.ts'`.

- [ ] **Step 3: Write `promotions.ts`**

```ts
// apps/mobile/src/mocks/promotions.ts
/**
 * Mock Promotion data (Artist Dashboard, Stitch "mmusic_boost"). No real
 * campaigns exist — launching one is explicitly disabled in the UI.
 */
export type PromoTool = { id: string; name: string; priceLabel: string; description: string; badge?: string };

export const PROMO_TOOLS: PromoTool[] = [
  {
    id: 'recommendation-boost',
    name: 'Recommendation Boost',
    priceLabel: 'From 1,500 сом',
    description: 'Priority placement in For You, New Releases, and Artist Radio mixes. AI targeting with high engagement.',
    badge: '3 formats',
  },
  {
    id: 'editorial-pitch',
    name: 'Editorial Pitch',
    priceLabel: '2 slots',
    description: 'Direct submission to curators: Top Kyrgyzstan, Electronic Chill, Evening Bishkek, and regional playlists.',
  },
  {
    id: 'home-banner',
    name: 'Home & Stories Banner',
    priceLabel: 'Premium',
    description: 'Exclusive hero visual in the app and a full-screen announcement in Stories, up to 180,000 impressions.',
    badge: 'Premium',
  },
];

export type ActiveCampaign = {
  trackId: string;
  dayOfTotal: string;
  reach: number;
  reachGoal: number;
  conversionRatePct: number;
  newFollowers: number;
  progressPct: number;
};

export const ACTIVE_CAMPAIGN: ActiveCampaign = {
  trackId: 'midnight-mirage',
  dayOfTotal: 'Day 4 of 10',
  reach: 12400,
  reachGoal: 25000,
  conversionRatePct: 8.4,
  newFollowers: 1041,
  progressPct: 49.6,
};

export type CampaignHistoryEntry = { id: string; trackTitle: string; metric: string; completedLabel: string; reach: number };

export const CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  { id: 'hist-vapor-trails', trackTitle: 'Vapor Trails', metric: '+42% streams', completedLabel: 'Completed Apr 28 · 10 days', reach: 34800 },
  { id: 'hist-horizon', trackTitle: 'Horizon (album)', metric: '+1,850 fans', completedLabel: 'Completed Mar 14 · 14 days', reach: 52100 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-promotions-mock.mjs`
Expected: PASS, "All promotions-mock checks passed."

- [ ] **Step 5: Add the script to the test chain**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-promotions-mock.mjs`, add `"verify:promotions-mock": "tsx scripts/verify-promotions-mock.mjs"`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/mocks/promotions.ts apps/mobile/scripts/verify-promotions-mock.mjs apps/mobile/package.json
git commit -m "feat(dashboard): mock promotion/campaign data"
```

---

### Task 3: `ListenTrendChart` component

**Files:**
- Create: `apps/mobile/src/lib/svg-path.ts` (pure path-building math)
- Create: `apps/mobile/src/components/dashboard/listen-trend-chart.tsx`
- Test: `apps/mobile/scripts/verify-svg-path.mjs`

**Interfaces:**
- Produces: `function smoothAreaPath(values: number[], width: number, height: number): { linePath: string; areaPath: string }` (pure); `function ListenTrendChart({ points, peakLabel }: { points: TrendPoint[]; peakLabel: string }): JSX.Element` — consumes `TrendPoint[]` from Task 1, consumed by Task 6.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-svg-path.mjs
#!/usr/bin/env node
/**
 * SVG path math for the Analytics trend chart (Catmull-Rom smoothing to
 * cubic Bezier, matching the Stitch "midnight_mirage" chart's hand-authored
 * style). Usage: npx tsx scripts/verify-svg-path.mjs
 */
import { smoothAreaPath } from '../src/lib/svg-path.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const { linePath, areaPath } = smoothAreaPath([10, 50, 30, 80, 20], 340, 130);
check('linePath starts with a moveto command', linePath.startsWith('M '));
check('linePath is non-empty for 5 points', linePath.length > 10);
check('areaPath closes back down to the baseline (contains L ...,height and Z)', areaPath.includes(`,130 L`) || areaPath.endsWith('Z'));
check('areaPath is longer than linePath (it adds the closing baseline segment)', areaPath.length > linePath.length);

const two = smoothAreaPath([5, 95], 340, 130);
check('works with exactly 2 points (minimum, 24h period)', two.linePath.startsWith('M ') && two.linePath.length > 5);

const flat = smoothAreaPath([50, 50, 50, 50], 340, 130);
check('a flat series produces a valid (non-crashing) path', flat.linePath.startsWith('M '));

const single = (() => {
  try {
    return smoothAreaPath([42], 340, 130);
  } catch {
    return null;
  }
})();
check('a single point does not throw', single !== null && single.linePath.length > 0);

if (failures > 0) {
  console.error(`\n${failures} svg-path check(s) failed.`);
  process.exit(1);
}
console.log('\nAll svg-path checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-svg-path.mjs`
Expected: FAIL — `Cannot find module '../src/lib/svg-path.ts'`.

- [ ] **Step 3: Write `svg-path.ts`**

```ts
// apps/mobile/src/lib/svg-path.ts
/**
 * Catmull-Rom-to-Bezier smoothing for the Analytics trend chart — produces
 * the same kind of smooth curve the Stitch mockup hand-authored, from real
 * (mock) data points instead of a fixed path string.
 */
function toXY(values: number[], width: number, height: number): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height * 0.85) - height * 0.08,
  }));
}

export function smoothAreaPath(values: number[], width: number, height: number): { linePath: string; areaPath: string } {
  const pts = toXY(values, width, height);
  if (pts.length === 0) return { linePath: '', areaPath: '' };
  if (pts.length === 1) {
    const p = pts[0]!;
    const linePath = `M ${p.x},${p.y} L ${p.x},${p.y}`;
    return { linePath, areaPath: `${linePath} L ${p.x},${height} L ${p.x},${height} Z` };
  }

  let d = `M ${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  return { linePath: d, areaPath: `${d} L ${last.x},${height} L ${first.x},${height} Z` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-svg-path.mjs`
Expected: PASS, "All svg-path checks passed."

- [ ] **Step 5: Build the chart component**

```tsx
// apps/mobile/src/components/dashboard/listen-trend-chart.tsx
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { smoothAreaPath } from '@/lib/svg-path';
import type { TrendPoint } from '@/lib/analytics-mock';

const CHART_WIDTH = 340;
const CHART_HEIGHT = 130;

/** The "Listening Trend" area+line chart (Stitch Artist Dashboard Analytics,
 * "midnight_mirage" export) — real mock data in, matching smoothed SVG curve
 * out, instead of the mockup's one fixed path string. */
export function ListenTrendChart({ points, peakLabel }: { points: TrendPoint[]; peakLabel: string }) {
  const { linePath, areaPath } = smoothAreaPath(
    points.map((p) => p.value),
    CHART_WIDTH,
    CHART_HEIGHT,
  );

  return (
    <View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={Colors.secondary} />
            <Stop offset="100%" stopColor={Colors.primary} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={CHART_HEIGHT * 0.15} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.15} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Line x1={0} y1={CHART_HEIGHT * 0.5} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Line x1={0} y1={CHART_HEIGHT * 0.85} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.85} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Path d={areaPath} fill="url(#trendFill)" />
        <Path d={linePath} fill="none" stroke="url(#trendStroke)" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
      <View style={styles.footer}>
        <ThemedText variant="body-sm" emphasis="medium">
          {points[0]?.label}
        </ThemedText>
        <ThemedText variant="body-sm" style={styles.peak}>
          Peak: {peakLabel}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {points[points.length - 1]?.label}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  peak: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Add the script to the test chain and commit**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-svg-path.mjs`, add `"verify:svg-path": "tsx scripts/verify-svg-path.mjs"`.

```bash
git add apps/mobile/src/lib/svg-path.ts apps/mobile/src/components/dashboard/listen-trend-chart.tsx apps/mobile/scripts/verify-svg-path.mjs apps/mobile/package.json
git commit -m "feat(dashboard): SVG trend-chart math and component"
```

---

### Task 4: Dashboard localization scaffold (EN/RU, no new dependency)

**Files:**
- Create: `apps/mobile/src/lib/dashboard-i18n.ts` (EN/RU string tables)
- Create: `apps/mobile/src/state/dashboard-locale-store.ts` (shared locale + `useDashboardStrings()` hook)
- Test: `apps/mobile/scripts/verify-dashboard-i18n.mjs`

**Interfaces:**
- Produces: `type DashboardLocale = 'en' | 'ru'`; `type DashboardStringKey = keyof typeof EN_STRINGS`; `useDashboardLocaleStore` (zustand, `{ locale: DashboardLocale; setLocale(l): void }`, default `'en'`, session-local — not persisted, out of scope for this plan); `useDashboardStrings(): { locale: DashboardLocale; t: (key: DashboardStringKey) => string }`. Consumed by Tasks 5-8 (every Dashboard screen).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-dashboard-i18n.mjs
#!/usr/bin/env node
/**
 * Dashboard EN/RU string table: every key present in both languages, no
 * empty strings. Usage: npx tsx scripts/verify-dashboard-i18n.mjs
 */
import { DASHBOARD_STRINGS } from '../src/lib/dashboard-i18n.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const enKeys = Object.keys(DASHBOARD_STRINGS.en);
const ruKeys = Object.keys(DASHBOARD_STRINGS.ru);
check('en and ru have exactly the same set of keys', enKeys.length === ruKeys.length && enKeys.every((k) => ruKeys.includes(k)));
check('every en string is non-empty', Object.values(DASHBOARD_STRINGS.en).every((v) => typeof v === 'string' && v.length > 0));
check('every ru string is non-empty', Object.values(DASHBOARD_STRINGS.ru).every((v) => typeof v === 'string' && v.length > 0));
check('at least 30 keys (covers tab labels, stats, FAQ, etc.)', enKeys.length >= 30);
check('en and ru actually differ for every key (no copy-pasted English)', enKeys.every((k) => DASHBOARD_STRINGS.en[k] !== DASHBOARD_STRINGS.ru[k]));

if (failures > 0) {
  console.error(`\n${failures} dashboard-i18n check(s) failed.`);
  process.exit(1);
}
console.log('\nAll dashboard-i18n checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-dashboard-i18n.mjs`
Expected: FAIL — `Cannot find module '../src/lib/dashboard-i18n.ts'`.

- [ ] **Step 3: Write `dashboard-i18n.ts`**

Russian copy below is taken directly from the Stitch exports (`mmusic_boost/code.html`, `mmusic_studio/code.html`, `midnight_mirage/code.html`) where available, not re-translated from scratch — matching the project's "use the actual Stitch exports as the visual reference" requirement even for the Russian track.

```ts
// apps/mobile/src/lib/dashboard-i18n.ts
/**
 * Dashboard-scoped EN/RU strings. Dependency-free (no i18next — that is
 * Phase 5 / docs/mmusic-task-tracker.md H-1, still TODO and gated behind its
 * own dependency-install approval). Same key-and-call shape (`t(key)`) a
 * future i18next migration can drop in without changing call sites.
 */
const EN_STRINGS = {
  overviewTab: 'Overview',
  analyticsTab: 'Analytics',
  promotionTab: 'Promotion',
  studioProTab: 'Studio Pro',
  uploadTrack: 'Upload Track',
  yourReleases: 'Your Releases',
  inRotation: 'In rotation',
  selectTrack: 'Select a track',
  trendSection: 'TREND',
  audienceSection: 'AUDIENCE',
  channelsSection: 'CHANNELS',
  listensOver: 'Listens over',
  listenerGeography: 'Listener geography',
  discoverySources: 'Discovery sources',
  averageListenTime: 'Average listen time',
  streams: 'Streams',
  listeners: 'Listeners',
  completion: 'Completion',
  inPlaylists: 'In playlists',
  period24h: '24 hours',
  period7d: '7 days',
  period28d: '28 days',
  periodAll: 'All time',
  promotionTools: 'Promotion tools',
  createCampaign: 'Create a new campaign',
  budget: 'BUDGET',
  launchViaMbank: 'Launch via MBANK',
  history: 'History',
  campaignReach: 'Campaign reach',
  fanConversion: 'Fan conversion',
  studioPlans: 'Mmusic Studio plans',
  studioPlansHint: 'Choose a tier to manage your discography, monetization, and advanced analytics.',
  monthly: 'Monthly',
  yearlyDiscount: 'Yearly (-20%)',
  currentPlan: 'Current plan',
  chooseTier: 'Choose',
  mbankBenefits: 'MBANK benefits',
  faqTitle: 'Frequently asked questions',
  faqChangePlanQ: 'How do I change or cancel my plan?',
  faqChangePlanA: "You can switch plans or turn off auto-renewal anytime in profile settings. PRO access stays active until the end of the paid period.",
  faqPayoutQ: 'How safe and fast are payouts?',
  faqPayoutA: "Payouts go directly to your linked MBANK account, protected by the bank's own security — most payouts complete within minutes.",
  perkCashbackTitle: '10% cashback',
  perkCashbackBody: 'Paying a tier with an MBANK card earns bonus points in the bank ecosystem.',
  perkDonationsTitle: 'Listener donations',
  perkDonationsBody: 'Fan support pays out automatically, directly to your MBANK account.',
  perkLegalTitle: 'Legal protection',
  perkLegalBody: 'Official copyright and related-rights registration in the Kyrgyz Republic.',
} as const;

const RU_STRINGS: Record<keyof typeof EN_STRINGS, string> = {
  overviewTab: 'Обзор',
  analyticsTab: 'Аналитика',
  promotionTab: 'Продвижение',
  studioProTab: 'Studio Pro',
  uploadTrack: 'Загрузить трек',
  yourReleases: 'Ваши релизы',
  inRotation: 'В ротации',
  selectTrack: 'Выберите трек',
  trendSection: 'ДИНАМИКА',
  audienceSection: 'АУДИТОРИЯ',
  channelsSection: 'КАНАЛЫ',
  listensOver: 'Прослушивания за',
  listenerGeography: 'География слушателей',
  discoverySources: 'Источники открытий',
  averageListenTime: 'Среднее время прослушивания',
  streams: 'Стримы',
  listeners: 'Слушатели',
  completion: 'Дослушивания',
  inPlaylists: 'В плейлистах',
  period24h: '24 часа',
  period7d: '7 дней',
  period28d: '28 дней',
  periodAll: 'Все время',
  promotionTools: 'Инструменты продвижения',
  createCampaign: 'Создать новую промо-кампанию',
  budget: 'БЮДЖЕТ КАМПАНИИ',
  launchViaMbank: 'Запустить промо через MBANK',
  history: 'История и результаты',
  campaignReach: 'Охват кампании',
  fanConversion: 'Конверсия в фанатов',
  studioPlans: 'Тарифы Mmusic Studio',
  studioPlansHint: 'Выберите уровень для управления дискографией, монетизацией и расширенной аналитикой',
  monthly: 'Помесячно',
  yearlyDiscount: 'На год (-20%)',
  currentPlan: 'Текущий тариф',
  chooseTier: 'Выбрать',
  mbankBenefits: 'Преимущества с MBANK',
  faqTitle: 'Частые вопросы',
  faqChangePlanQ: 'Как изменить или отменить тариф?',
  faqChangePlanA: 'Вы можете переключить тариф или отключить автопродление в любой момент в настройках профиля. Доступ к PRO сохранится до конца оплаченного периода.',
  faqPayoutQ: 'Безопасность и скорость выплат',
  faqPayoutA: 'Выплаты поступают напрямую на привязанный счёт MBANK с защитой банка — большинство выплат проходят за несколько минут.',
  perkCashbackTitle: 'Кешбэк 10% бонусами',
  perkCashbackBody: 'При оплате тарифов картой MBANK начисляются бонусы в экосистеме банка.',
  perkDonationsTitle: 'Донаты от слушателей',
  perkDonationsBody: 'Автоматическая прямая выплата донатов от фанатов прямо на ваш расчётный счёт в MBANK.',
  perkLegalTitle: 'Юридическая защита',
  perkLegalBody: 'Официальная фиксация авторских и смежных прав на территории Кыргызской Республики.',
};

export type DashboardLocale = 'en' | 'ru';
export type DashboardStringKey = keyof typeof EN_STRINGS;
export const DASHBOARD_STRINGS: Record<DashboardLocale, Record<DashboardStringKey, string>> = { en: EN_STRINGS, ru: RU_STRINGS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-dashboard-i18n.mjs`
Expected: PASS, "All dashboard-i18n checks passed."

- [ ] **Step 5: Write the locale store + hook**

```ts
// apps/mobile/src/state/dashboard-locale-store.ts
import { create } from 'zustand';

import { DASHBOARD_STRINGS, type DashboardLocale, type DashboardStringKey } from '@/lib/dashboard-i18n';

type DashboardLocaleState = {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
};

/** Shared across all four Dashboard tabs (not persisted — session-local for
 * this first pass; real persistence lands with the Phase 5 i18next rollout,
 * docs/mmusic-task-tracker.md H-1). */
export const useDashboardLocaleStore = create<DashboardLocaleState>((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}));

export function useDashboardStrings() {
  const locale = useDashboardLocaleStore((s) => s.locale);
  const setLocale = useDashboardLocaleStore((s) => s.setLocale);
  const t = (key: DashboardStringKey) => DASHBOARD_STRINGS[locale][key];
  return { locale, setLocale, t };
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Add the script to the test chain and commit**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-dashboard-i18n.mjs`, add `"verify:dashboard-i18n": "tsx scripts/verify-dashboard-i18n.mjs"`.

```bash
git add apps/mobile/src/lib/dashboard-i18n.ts apps/mobile/src/state/dashboard-locale-store.ts apps/mobile/scripts/verify-dashboard-i18n.mjs apps/mobile/package.json
git commit -m "feat(dashboard): EN/RU localization scaffold (no new dependency)"
```

---

### Task 5: Dashboard shell — own tab navigator + Overview + locale toggle

**Files:**
- Delete: `apps/mobile/src/app/profile/artist/dashboard.tsx` (content migrates into `dashboard/index.tsx` below)
- Create: `apps/mobile/src/components/dashboard/dashboard-tab-bar.tsx`
- Create: `apps/mobile/src/app/profile/artist/dashboard/_layout.tsx`
- Create: `apps/mobile/src/app/profile/artist/dashboard/index.tsx` (Overview)
- Test: `apps/mobile/scripts/verify-dashboard-routes.mjs`

**Interfaces:**
- Consumes: `useArtistStore`, `usePlayerStore` (unchanged, same as today's `dashboard.tsx`), `useDashboardStrings` (Task 4) for tab labels and a visible EN/RU toggle.
- Produces: the route `/profile/artist/dashboard` now resolves to this new nested navigator's Overview tab; sibling routes `/profile/artist/dashboard/analytics`, `/promotion`, `/studio-pro` become reachable (built in Tasks 6-8). `profile/index.tsx`'s existing link (`router.push('/profile/artist/dashboard')`, `profile/index.tsx:122`) needs no change — it already targets this path.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/scripts/verify-dashboard-routes.mjs
#!/usr/bin/env node
/**
 * Artist Dashboard's own nested routes exist and the old single-file route
 * is gone (replaced by the tabbed shell). Usage: npx tsx scripts/verify-dashboard-routes.mjs
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..', 'src', 'app');

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('old single-file dashboard.tsx is gone (replaced by the dashboard/ folder)', !existsSync(join(APP, 'profile', 'artist', 'dashboard.tsx')));
check('dashboard/_layout.tsx exists', existsSync(join(APP, 'profile', 'artist', 'dashboard', '_layout.tsx')));
check('dashboard/index.tsx (Overview) exists', existsSync(join(APP, 'profile', 'artist', 'dashboard', 'index.tsx')));

if (failures > 0) {
  console.error(`\n${failures} dashboard-routes check(s) failed.`);
  process.exit(1);
}
console.log('\nAll dashboard-routes checks passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-dashboard-routes.mjs`
Expected: FAIL — old `dashboard.tsx` still exists, new files don't.

- [ ] **Step 3: Build the Dashboard's own tab bar**

```tsx
// apps/mobile/src/components/dashboard/dashboard-tab-bar.tsx
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICON_SIZE = 22;

/** Maps each route name to its localized-label key (Task 4). */
const TAB_LABEL_KEY = {
  index: 'overviewTab',
  analytics: 'analyticsTab',
  promotion: 'promotionTab',
  'studio-pro': 'studioProTab',
} as const;

/**
 * Artist Dashboard's own bottom tab bar (Overview/Analytics/Promotion/Studio
 * Pro) — a plain, solid-surface row, visually consistent with the listener
 * FloatingTabBar but a fully separate component: switching these tabs never
 * touches the listener `(tabs)` group's state, and vice versa (OQ-56).
 */
export function DashboardTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useDashboardStrings();
  return (
    <View style={[styles.row, { paddingBottom: insets.bottom || Spacing.sm }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? Colors.primary : Colors.text.medium;
        const labelKey = TAB_LABEL_KEY[route.name as keyof typeof TAB_LABEL_KEY];
        const label = labelKey ? t(labelKey) : typeof options.title === 'string' ? options.title : route.name;
        return (
          <PressableScale
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => navigation.navigate(route.name)}
            style={styles.item}
          >
            {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
            <ThemedText variant="label-sm" style={{ color }}>
              {label}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.l1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
});
```

- [ ] **Step 4: Build the nested `Tabs` layout**

```tsx
// apps/mobile/src/app/profile/artist/dashboard/_layout.tsx
import { Tabs } from 'expo-router';

import { DashboardTabBar } from '@/components/dashboard/dashboard-tab-bar';
import { Icon } from '@/components/ui/icon';

const ICON_SIZE = 22;

/** Artist Dashboard's own navigator (OQ-56) — Overview/Analytics/Promotion/
 * Studio Pro, architecturally independent from the listener `(tabs)` group. */
export default function DashboardLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <DashboardTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color }) => <Icon name="dashboard" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Icon name="show-chart" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="promotion" options={{ title: 'Promotion', tabBarIcon: ({ color }) => <Icon name="campaign" color={color} size={ICON_SIZE} /> }} />
      <Tabs.Screen name="studio-pro" options={{ title: 'Studio Pro', tabBarIcon: ({ color }) => <Icon name="equalizer" color={color} size={ICON_SIZE} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Move Overview's content, wire localization**

Move the full existing body of `apps/mobile/src/app/profile/artist/dashboard.tsx` into `apps/mobile/src/app/profile/artist/dashboard/index.tsx` — same imports, same JSX structure, same styles (this is a move/adapt, not a redesign, per the user's explicit instruction). Two additions on top of the move:

1. Replace the literal strings `"Upload Track"`, `"Listeners"`, `"Streams"`, `"Support"`, `"Your Releases"` with `t('uploadTrack')`, `t('listeners')`, `t('streams')`, … using `const { t, locale, setLocale } = useDashboardStrings();` (Task 4) — the `FILTERS`/`STATUS_LABEL` chip/status text can stay English-only for now (not in the Task 4 string table; out of scope for this pass, same honesty-over-completeness tradeoff as other deferred-minor decisions in this project).
2. Add a small, visible locale toggle — two `Chip`s ("EN"/"RU") near the top of the Overview screen, calling `setLocale('en')`/`setLocale('ru')`, `selected={locale === 'en'}` etc. Since the locale store (Task 4) is shared across the whole Dashboard navigator, toggling here changes all four tabs — this is the one and only locale switch UI for the whole feature, deliberately placed on the landing tab.

Delete the old `dashboard.tsx`.

- [ ] **Step 6: Typecheck, lint, and manually verify the route**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

Run `cd apps/mobile && npx expo start --web --port 8092`, navigate to `/profile/artist/dashboard` (with a local artist profile already set up) — confirm it shows Overview content under the new 4-tab bar, and tapping the other 3 tabs navigates (even though Analytics/Promotion/Studio Pro aren't built yet in this task — Expo Router will 404 on them until Tasks 5-7 land; that is expected at this point in the plan and not a regression to fix here).

- [ ] **Step 7: Run the test and the full existing suite**

Run: `cd apps/mobile && npx tsx scripts/verify-dashboard-routes.mjs && npm test`
Expected: dashboard-routes passes; full suite stays green (confirms nothing in Home/Search/Library/Player broke).

- [ ] **Step 8: Add the script to the test chain and commit**

Modify `apps/mobile/package.json`: append `&& tsx scripts/verify-dashboard-routes.mjs`, add `"verify:dashboard-routes": "tsx scripts/verify-dashboard-routes.mjs"`.

```bash
git add apps/mobile/src/components/dashboard/dashboard-tab-bar.tsx apps/mobile/src/app/profile/artist/dashboard/_layout.tsx apps/mobile/src/app/profile/artist/dashboard/index.tsx apps/mobile/scripts/verify-dashboard-routes.mjs apps/mobile/package.json
git rm apps/mobile/src/app/profile/artist/dashboard.tsx
git commit -m "feat(dashboard): own tab navigator, Overview migrated"
```

---

### Task 6: Analytics screen

**Files:**
- Create: `apps/mobile/src/app/profile/artist/dashboard/analytics.tsx`

**Interfaces:**
- Consumes: `getTrackAnalytics` (Task 1), `ListenTrendChart` (Task 3), `useDashboardStrings` (Task 4), `useArtistStore` (for the artist's own published tracks, to populate the track selector).

- [ ] **Step 1: Build the screen**

```tsx
// apps/mobile/src/app/profile/artist/dashboard/analytics.tsx
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListenTrendChart } from '@/components/dashboard/listen-trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getTrackAnalytics, type TimePeriod } from '@/lib/analytics-mock';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';

const PERIOD_KEYS: { id: TimePeriod; key: DashboardStringKey }[] = [
  { id: '24h', key: 'period24h' },
  { id: '7d', key: 'period7d' },
  { id: '28d', key: 'period28d' },
  { id: 'all', key: 'periodAll' },
];

/** Artist Dashboard — Analytics tab (Stitch "midnight_mirage"). Mock data
 * only (src/lib/analytics-mock.ts) — clearly not real telemetry. */
export default function AnalyticsScreen() {
  const { t } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [trackId, setTrackId] = useState(published[0]?.track.id ?? 'midnight-mirage');
  const [period, setPeriod] = useState<TimePeriod>('28d');

  const track = published.find((e) => e.track.id === trackId)?.track;
  const data = getTrackAnalytics(trackId, period);
  const periodLabel = t(PERIOD_KEYS.find((p) => p.id === period)!.key);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trackHeader}>
          <Artwork uri={track?.coverUri} size={56} radius={Radii.DEFAULT} />
          <View style={styles.trackText}>
            <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
              {t('inRotation')}
            </ThemedText>
            <ThemedText variant="headline-md" numberOfLines={1}>
              {track?.title ?? t('selectTrack')}
            </ThemedText>
          </View>
        </View>

        {published.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {published.map((e) => (
              <Chip key={e.track.id} label={e.track.title} selected={e.track.id === trackId} onPress={() => setTrackId(e.track.id)} />
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIOD_KEYS.map((p) => (
            <Chip key={p.id} label={t(p.key)} selected={p.id === period} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>

        <View style={styles.statsGrid}>
          <StatCard label={t('streams')} value={data.streams.toLocaleString('en-US')} />
          <StatCard label={t('listeners')} value={data.listeners.toLocaleString('en-US')} />
          <StatCard label={t('completion')} value={`${data.completionPct}%`} />
          <StatCard label={t('inPlaylists')} value={data.playlistAdds.toLocaleString('en-US')} />
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('trendSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listensOver')} {periodLabel.toLowerCase()}</ThemedText>
          <ListenTrendChart points={data.trend} peakLabel={data.peak.toLocaleString('en-US')} />
          <View style={styles.chartFooter}>
            <ThemedText variant="body-sm" emphasis="medium">
              {t('averageListenTime')}
            </ThemedText>
            <ThemedText variant="body-sm">
              {Math.floor(data.avgListenSec / 60)}:{String(data.avgListenSec % 60).padStart(2, '0')} ({data.avgListenPct}%)
            </ThemedText>
          </View>
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('audienceSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('listenerGeography')}</ThemedText>
          {data.geography.map((g) => (
            <View key={g.city} style={styles.barRow}>
              <ThemedText variant="body-sm">
                {g.city} <ThemedText variant="body-sm" emphasis="medium">{g.country}</ThemedText>
              </ThemedText>
              <ThemedText variant="label-lg">{g.pct}%</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <ThemedText variant="label-sm" emphasis="medium" style={styles.sectionLabel}>
            {t('channelsSection')}
          </ThemedText>
          <ThemedText variant="headline-sm">{t('discoverySources')}</ThemedText>
          <View style={styles.statsGrid}>
            {data.channels.map((c) => (
              <StatCard key={c.name} label={c.name} value={`${c.pct}%`} />
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  trackHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  trackText: { flex: 1, minWidth: 0, gap: 2 },
  filterRow: { gap: Spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chartCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.surface.l3 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `cd apps/mobile && npx expo start --web --port 8092`, navigate to `/profile/artist/dashboard/analytics` with a published track in the local artist profile. Switch the time-period chip through all 4 values — confirm the stat numbers, the chart's shape, and the peak label all change each time, and reselecting a period you already viewed shows the exact same numbers again (not reshuffled). Toggle the locale on Overview, return here, confirm all labels switched to Russian.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/profile/artist/dashboard/analytics.tsx
git commit -m "feat(dashboard): Analytics tab"
```

---

### Task 7: Promotion screen

**Files:**
- Create: `apps/mobile/src/app/profile/artist/dashboard/promotion.tsx`

**Interfaces:**
- Consumes: `PROMO_TOOLS`, `ACTIVE_CAMPAIGN`, `CAMPAIGN_HISTORY` (Task 2), `useDashboardStrings` (Task 4), `useArtistStore`, `useToast` (existing hook, same honest-disabled-action pattern as Support).

- [ ] **Step 1: Build the screen**

```tsx
// apps/mobile/src/app/profile/artist/dashboard/promotion.tsx
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, PillButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { formatKgsAmount } from '@/lib/format-currency';
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_TOOLS } from '@/mocks/promotions';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useArtistStore } from '@/state/artist-store';

const BUDGETS = [1000, 2500, 5000];

/** Artist Dashboard — Promotion tab (Stitch "mmusic_boost"). No real campaign
 * ever launches — "Launch via MBANK" is explicitly disabled, same honest
 * pattern as the listener Support flow. */
export default function PromotionScreen() {
  const { t } = useDashboardStrings();
  const entries = useArtistStore((s) => s.entries);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const [campaignTrackId, setCampaignTrackId] = useState(published[0]?.track.id);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const { showToast, toast } = useToast();

  const activeTrack = published.find((e) => e.track.id === ACTIVE_CAMPAIGN.trackId)?.track;
  const campaignTrack = published.find((e) => e.track.id === campaignTrackId)?.track;

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
            LIVE · {ACTIVE_CAMPAIGN.dayOfTotal}
          </ThemedText>
          <View style={styles.activeRow}>
            <Artwork uri={activeTrack?.coverUri} size={48} radius={Radii.DEFAULT} />
            <ThemedText variant="headline-sm" numberOfLines={1} style={styles.flexText}>
              {activeTrack?.title ?? ACTIVE_CAMPAIGN.trackId}
            </ThemedText>
          </View>
          <View style={styles.statsRow}>
            <View>
              <ThemedText variant="body-sm" emphasis="medium">{t('campaignReach')}</ThemedText>
              <ThemedText variant="headline-md">{ACTIVE_CAMPAIGN.reach.toLocaleString('en-US')} / {(ACTIVE_CAMPAIGN.reachGoal / 1000).toFixed(0)}k</ThemedText>
            </View>
            <View>
              <ThemedText variant="body-sm" emphasis="medium">{t('fanConversion')}</ThemedText>
              <ThemedText variant="headline-md">{ACTIVE_CAMPAIGN.conversionRatePct}% CR</ThemedText>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${ACTIVE_CAMPAIGN.progressPct}%` }]} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('promotionTools')}</ThemedText>
          {PROMO_TOOLS.map((tool) => (
            <View key={tool.id} style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <ThemedText variant="label-lg" style={styles.flexText}>{tool.name}</ThemedText>
                <ThemedText variant="body-sm" style={{ color: Colors.secondary }}>{tool.priceLabel}</ThemedText>
              </View>
              <ThemedText variant="body-sm" emphasis="medium">{tool.description}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('createCampaign')}</ThemedText>
          {published.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {published.map((e) => (
                <Chip key={e.track.id} label={e.track.title} selected={e.track.id === campaignTrackId} onPress={() => setCampaignTrackId(e.track.id)} />
              ))}
            </ScrollView>
          )}
          <ThemedText variant="label-sm" emphasis="medium">{t('budget')}</ThemedText>
          <View style={styles.filterRow}>
            {BUDGETS.map((b) => (
              <Chip key={b} label={`${formatKgsAmount(b)} сом`} selected={b === budget} onPress={() => setBudget(b)} />
            ))}
          </View>
          <PillButton
            label={t('launchViaMbank')}
            trailingIcon="arrow-forward"
            style={styles.launchButton}
            onPress={() => showToast('Launching promotion campaigns isn\'t available in this preview', 'campaign')}
          />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('history')}</ThemedText>
          {CAMPAIGN_HISTORY.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.flexText}>
                <ThemedText variant="label-lg">{h.trackTitle}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{h.completedLabel}</ThemedText>
              </View>
              <ThemedText variant="label-lg" style={{ color: Colors.tertiary }}>{h.metric}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.lg, paddingBottom: Spacing.xl * 3 },
  card: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface.l3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  section: { gap: Spacing.sm },
  toolCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.md, gap: 4 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: Spacing.xs },
  launchButton: { marginTop: Spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
});
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Confirm the active-campaign card renders, the track-selector chip switches `campaignTrack`'s displayed state, budget chips toggle, and tapping "Launch via MBANK" shows the honest toast rather than doing nothing or erroring.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/profile/artist/dashboard/promotion.tsx
git commit -m "feat(dashboard): Promotion tab"
```

---

### Task 8: Studio Pro screen (with FAQ accordion)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/dashboard/studio-pro.tsx`

**Interfaces:**
- Consumes: `useToast`, `formatKgsAmount`, `useDashboardStrings` (Task 4, including the two FAQ Q&A keys). No new data file for tiers/perks — static content matching the Stitch mockup's own fixed structure. FAQ copy comes from the Task 4 string table (`faqChangePlanQ/A`, `faqPayoutQ/A`) — the two questions actually present in `mmusic_studio/screen.png`'s "Частые вопросы" section.

- [ ] **Step 1: Build the screen**

```tsx
// apps/mobile/src/app/profile/artist/dashboard/studio-pro.tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, Icon, PillButton, PressableScale } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { formatKgsAmount } from '@/lib/format-currency';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const TIERS = [
  {
    id: 'studio-pro',
    badge: 'RECOMMENDED',
    name: 'Studio PRO',
    tagline: 'Maximum reach and 100% revenue',
    priceYear: 3740,
    priceMonthLabel: '311 сом/mo',
    features: ['Unlimited Lossless (FLAC/WAV 24-bit) uploads', 'Real-time analytics — per-second stats and cities', 'Editorial pitching into official Mmusic playlists', '100% royalties, no platform fee', 'Instant MBANK payout, 24/7, no fee', 'Verified artist badge'],
    current: false,
  },
  {
    id: 'basic',
    badge: 'FOR STARTING OUT',
    name: 'Basic Artist',
    tagline: 'Free, forever',
    priceYear: 0,
    priceMonthLabel: 'forever',
    features: ['Up to 3 releases per year', 'Basic stream stats (weekly)', '70% streaming royalties', 'MBANK payout once a month'],
    current: true,
  },
  {
    id: 'label-team',
    badge: 'TEAMS & LABELS',
    name: 'Label & Team',
    tagline: 'Manage a roster of artists',
    priceYear: 9500,
    priceMonthLabel: '790 сом/mo',
    features: ['Up to 10 artists in one workspace', 'Multi-access for managers and sound producers', '100% payouts with split royalties', 'A dedicated Mmusic & MBANK curator'],
    current: false,
  },
];

const PERKS: { icon: string; titleKey: DashboardStringKey; bodyKey: DashboardStringKey }[] = [
  { icon: 'percent', titleKey: 'perkCashbackTitle', bodyKey: 'perkCashbackBody' },
  { icon: 'volunteer-activism', titleKey: 'perkDonationsTitle', bodyKey: 'perkDonationsBody' },
  { icon: 'gavel', titleKey: 'perkLegalTitle', bodyKey: 'perkLegalBody' },
];

const FAQ: { qKey: DashboardStringKey; aKey: DashboardStringKey }[] = [
  { qKey: 'faqChangePlanQ', aKey: 'faqChangePlanA' },
  { qKey: 'faqPayoutQ', aKey: 'faqPayoutA' },
];

/** One FAQ row, real per-item expand/collapse state — matches Stitch
 * "mmusic_studio"'s accordion (expanding one question never affects another). */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PressableScale onPress={() => setOpen((v) => !v)} style={styles.faqItem} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={styles.faqHeader}>
        <ThemedText variant="label-lg" style={styles.flexText}>{question}</ThemedText>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={20} color={Colors.text.medium} />
      </View>
      {open && <ThemedText variant="body-sm" emphasis="medium" style={styles.faqAnswer}>{answer}</ThemedText>}
    </PressableScale>
  );
}

/** Artist Dashboard — Studio Pro tab (Stitch "mmusic_studio"). Every
 * subscribe CTA is explicitly disabled — no real subscriptions exist. */
export default function StudioProScreen() {
  const { t } = useDashboardStrings();
  const [yearly, setYearly] = useState(true);
  const { showToast, toast } = useToast();

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="headline-lg">{t('studioPlans')}</ThemedText>
        <ThemedText variant="body-md" emphasis="medium">{t('studioPlansHint')}</ThemedText>

        <View style={styles.toggleRow}>
          <Chip label={t('monthly')} selected={!yearly} onPress={() => setYearly(false)} />
          <Chip label={t('yearlyDiscount')} selected={yearly} onPress={() => setYearly(true)} />
        </View>

        {TIERS.map((tier) => (
          <View key={tier.id} style={[styles.tierCard, tier.id === 'studio-pro' && styles.tierCardHighlight]}>
            <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>{tier.badge}</ThemedText>
            <ThemedText variant="headline-lg">{tier.name}</ThemedText>
            <ThemedText variant="body-sm" emphasis="medium">{tier.tagline}</ThemedText>
            <ThemedText variant="display-sm">
              {tier.priceYear === 0 ? '0 сом' : `${formatKgsAmount(yearly ? tier.priceYear : Math.round((tier.priceYear / 10) * 1.15))} сом`}
              <ThemedText variant="body-sm" emphasis="medium"> / {tier.priceYear === 0 ? 'forever' : yearly ? 'year' : 'month'}</ThemedText>
            </ThemedText>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon name="check" size={16} color={Colors.tertiary} />
                <ThemedText variant="body-sm" style={styles.flexText}>{f}</ThemedText>
              </View>
            ))}
            <PillButton
              label={tier.current ? t('currentPlan') : `${t('chooseTier')} ${tier.name}`}
              disabled={tier.current}
              onPress={tier.current ? undefined : () => showToast('Subscriptions aren\'t available in this preview', 'studio')}
              style={styles.tierButton}
            />
          </View>
        ))}

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('mbankBenefits')}</ThemedText>
          {PERKS.map((p) => (
            <View key={p.titleKey} style={styles.perkRow}>
              <Icon name={p.icon} size={20} color={Colors.primary} />
              <View style={styles.flexText}>
                <ThemedText variant="label-lg">{t(p.titleKey)}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">{t(p.bodyKey)}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('faqTitle')}</ThemedText>
          {FAQ.map((item) => (
            <FaqItem key={item.qKey} question={t(item.qKey)} answer={t(item.aKey)} />
          ))}
        </View>
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.md, paddingBottom: Spacing.xl * 3 },
  toggleRow: { flexDirection: 'row', gap: Spacing.xs },
  tierCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.xs },
  tierCardHighlight: { borderWidth: 1, borderColor: Colors.primary },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flexText: { flex: 1, minWidth: 0 },
  tierButton: { marginTop: Spacing.sm },
  section: { gap: Spacing.sm, marginTop: Spacing.sm },
  perkRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  faqItem: { backgroundColor: Colors.surface.l1, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqAnswer: { lineHeight: 20 },
});
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Toggle Monthly/Yearly — confirm the price text changes. Tap "Choose Studio PRO"/"Choose Label & Team" — confirm the honest disabled toast, not a silent no-op. Confirm "Current plan" (Basic Artist) is visibly disabled/non-interactive. Tap each FAQ question — confirm it expands independently (the other stays collapsed), and tapping again collapses it. Toggle the locale to Russian — confirm the FAQ questions/answers switch language too, matching `mmusic_studio/screen.png`'s own Russian copy.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/profile/artist/dashboard/studio-pro.tsx
git commit -m "feat(dashboard): Studio Pro tab with FAQ accordion"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full automated suite**

Run: `cd apps/mobile && npm test`
Expected: every `verify-*.mjs` passes, including the 5 new ones from Tasks 1, 2, 3, 4, 5 (`verify-analytics-mock`, `verify-promotions-mock`, `verify-svg-path`, `verify-dashboard-i18n`, `verify-dashboard-routes`).

- [ ] **Step 2: Typecheck, lint, production build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm run build:web`
Expected: all clean/succeed.

- [ ] **Step 3: Responsive manual pass**

Serve the production build (`node scripts/serve-web.mjs dist --port 8095`) and check all 4 Dashboard tabs at: a narrow mobile viewport (iPhone-width), a mid-size tablet-ish width, and a wide desktop viewport. Confirm the existing phone-width-column centering (`MAX_CONTENT_WIDTH`) applies here exactly as it does on every other screen — no new breakpoint code should be needed; this step is confirming that holds, not building anything new.

- [ ] **Step 4: Localization manual pass**

Toggle to Russian on Overview, then visit Analytics, Promotion, and Studio Pro in turn — confirm every tab is already in Russian (shared locale store, no per-screen toggle needed) and no string is left in English except track titles/artist names (data, not UI copy — correctly untranslated) and the two disabled-action toast messages (documented, deliberate scope trim). Confirm Russian text doesn't overflow stat tiles, chips, or FAQ rows (Review Focus item).

- [ ] **Step 5: Confirm zero changes to frozen screens**

Run: `git diff --stat -- apps/mobile/src/app/'(tabs)' apps/mobile/src/components/nav apps/mobile/src/components/mini-player.tsx apps/mobile/src/components/ui/particle-wave apps/mobile/src/state/player-store.ts`
Expected: empty output — this plan's tasks never touch any of these paths.

- [ ] **Step 6: Independent code review**

Dispatch a fresh reviewer (most capable available model) against the whole branch diff for this plan, per superpowers:subagent-driven-development's Final Review step (the execution method chosen for this plan) — Critical/Important findings get one fix pass with tests; Minor findings go to the ledger as deferred.

---
