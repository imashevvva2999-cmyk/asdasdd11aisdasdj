# Stitch Artist Promotion Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (native, single session — see Execution Notes). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Mmusic Artist Dashboard → Promotion tab's UI with the new Google Stitch "Mmusic Studio / Artist Promotion" design (`stitch_mmusic_mobile_streaming_app/stitch_artist-promotion/`), turning the single disabled-button screen into a real 4-step campaign flow (track → package → audience setup → review & pay), while keeping every number honest (no fabricated bank balances, fees, moderation SLAs, or "campaign launched for real" claims) and touching nothing outside Promotion.

**Architecture:** New screens live as sibling Stack routes under `profile/artist/campaign/*` (registered in the existing flat `profile/_layout.tsx` Stack, exactly like `artist/become-artist` / `artist/setup` / `artist/upload-track` already are) so the Dashboard's own Tabs (`Overview` / `Analytics` / `Promotion` / `Studio Pro`) are never touched. A new `campaign-store.ts` (zustand) carries the wizard's selection state across screens, mirroring `support-store.ts`'s `startX → selectY → goToConfirm → confirm() → success` shape exactly, including its honest "no real backend call" comment convention. The redesigned Promotion dashboard (`dashboard/promotion.tsx`) becomes the entry point into that flow; its existing `ACTIVE_CAMPAIGN` / `CAMPAIGN_HISTORY` mock data is extended (not replaced) with the extra fields the new design needs.

**Tech Stack:** Expo Router (file-based Stack routes), React Native + `StyleSheet`, zustand, `@mmusic/design-tokens` (the only color/spacing/typography source — never hardcode hex), existing `components/ui` primitives, `tsx`-run `scripts/verify-*.mjs` as this project's test suite (no Jest/RNTL configured).

**Spec:** User's integration request (pasted task, this conversation) + `stitch_mmusic_mobile_streaming_app/stitch_artist-promotion/{1._mmusic_studio,2.,3.,4._bottom_sheet,5.,6._mbank_pay,7.,8.}/{code.html,screen.png}` + `stitch_mmusic_mobile_streaming_app/stitch_artist-promotion/nocturne_audio/DESIGN.md` (reference only — its raw color YAML is **not** canonical, see Global Constraints).

## Global Constraints

- Dark-only, tokens from `@mmusic/design-tokens` (`Colors`/`Spacing`/`Radii`/`TypeScale`/`Fonts` re-exported via `src/constants/theme.ts`) — never a raw hex/rgba in a new `StyleSheet.create()` beyond the few translucent overlays the existing files already use (e.g. `rgba(255,255,255,0.08)`), and never a second theme file.
- The new Stitch export's YAML `colors:`/`typography:` frontmatter is **not** canonical (see `packages/design-tokens/src/colors.ts` header comment, and `docs/screens.md §3.1`) — use the existing tokens, not the export's palette.
- **No real transactions, no fabricated real-world facts.** Same documented policy as `support-confirm.tsx`/`support-success.tsx` (OQ-10/OQ-44): no real MBANK balance figures, no cashback/fee claims, no "Studio Wallet" balance, no claimed moderation SLA, no calendar dates computed from "today" (non-deterministic across static-export builds — see `verify-routes.mjs`'s "build-time-independent dates" comment). Forecast ranges are fine *because the Stitch copy itself already frames them as "демонстрационного характера"* — keep that framing.
- Do not touch `dashboard/_layout.tsx` (the Tabs), `dashboard/index.tsx`, `dashboard/analytics.tsx`, `dashboard/studio-pro.tsx`, `become-artist.tsx`, or any listener-facing (`sheets/*`, `lib/i18n.ts`, `state/locale-store.ts`) file.
- `PROMO_TOOLS` (existing export in `mocks/promotions.ts`) stays byte-for-byte as is — `verify-promotions-mock.mjs` asserts on it and nothing requires deleting it even though the redesigned dashboard no longer renders it as its own section.
- Every new/changed user-facing string goes into `DASHBOARD_STRINGS` (`src/lib/dashboard-i18n.ts`) in **both** `en` and `ru`, and must differ between the two (enforced by `verify-dashboard-i18n.mjs`).
- `ACTIVE_CAMPAIGN.reach <= ACTIVE_CAMPAIGN.reachGoal` and `progressPct === Math.round((reach/reachGoal)*1000)/10` must keep holding (enforced by `verify-promotions-mock.mjs`) — don't edit those two fields' relationship.
- No new files under `stitch_mmusic_mobile_streaming_app/` (design folder is read-only, per project CLAUDE.md).
- Don't commit, push, merge, or deploy — leave changes in the working tree.

## Review Focus

- **Cold static export of every new route** (no track/package/audience selected — `expo export --platform web` renders with a fresh store on every build): each new screen must render a real, non-crashing "nothing selected yet" fallback, not a blank screen or a thrown error reading `undefined.title`. Pin this with explicit entries in `scripts/verify-routes.mjs` for each new route, mirroring the existing `support-confirm.html` → `'Nothing to confirm'` pattern.
- **`campaign-store.confirm()` guard**: calling `confirm()` with no track/package selected must be a no-op (mirrors `support-store.confirm()`'s guard) — otherwise a route hit mid-flow (e.g. a deep link or a fast double-tap) could append a bogus "launched campaign" entry. Test this directly, like `verify-support-store.mjs` does for the no-op case.
- **Locale correctness mid-flow**: every new screen reads via `useDashboardStrings()` (not the listener `useAppStrings()`), and switching the global language (Settings → App Language) while inside the campaign flow must not crash or show a stale key — since `useDashboardStrings`/`useAppStrings` share the same underlying `useLocaleStore`, this is "free" as long as every string genuinely comes from `DASHBOARD_STRINGS`.
- **The "preserve existing track list" input**: a user with zero or exactly one `published` track. Track-select screen must not crash on an empty `published` array (show an empty state, same `EmptyState` component used elsewhere) and must auto-select the sole track when there's exactly one (mirrors `promotion.tsx`'s existing `published[0]?.track.id` default).
- **Re-entering the flow after a completed campaign**: pressing "Создать новую кампанию" a second time after `success` must reset `campaign-store` back to `selectingTrack` (not resume mid-flow with stale selections) — mirrors `support-store.reset()` being called from `support-success.tsx`'s "Done" handler.
- **Package price formatting for the free tier**: `START` is `0 сом` — `formatKgsAmount(0)` / the confirm screen's "Pay N сом via MBANK" button text must read sensibly at zero (e.g. still show "0 сом", not blank or `NaN`), since START is a real, selectable tier in the Stitch design, not a disabled placeholder.

---

## File Structure

**Create:**
- `apps/mobile/src/state/campaign-store.ts` — wizard state (zustand), mirrors `support-store.ts`.
- `apps/mobile/src/app/profile/artist/campaign/select-track.tsx` — Stitch screen 2.
- `apps/mobile/src/app/profile/artist/campaign/select-package.tsx` — Stitch screen 3.
- `apps/mobile/src/app/profile/artist/campaign/package-details.tsx` — Stitch screen 4 (bottom sheet, `transparentModal`).
- `apps/mobile/src/app/profile/artist/campaign/setup.tsx` — Stitch screen 5.
- `apps/mobile/src/app/profile/artist/campaign/confirm.tsx` — Stitch screen 6 (review + MBANK pay, reusing the `support-confirm.tsx` pattern).
- `apps/mobile/src/app/profile/artist/campaign/success.tsx` — Stitch screen 7.
- `apps/mobile/src/app/profile/artist/campaign/statistics.tsx` — Stitch screen 8.
- `apps/mobile/scripts/verify-campaign-store.mjs` — store behavior checks, mirrors `verify-support-store.mjs`.

**Modify:**
- `apps/mobile/src/mocks/promotions.ts` — add `PROMO_PACKAGES` (new export, the 4 Stitch tiers), extend `ActiveCampaign` and `CampaignHistoryEntry` with new optional fields; `PROMO_TOOLS`/`ACTIVE_CAMPAIGN`/`CAMPAIGN_HISTORY` existing fields untouched.
- `apps/mobile/src/lib/dashboard-i18n.ts` — new EN/RU keys for all 7 new screens + redesigned dashboard.
- `apps/mobile/src/app/profile/_layout.tsx` — register the 7 new `artist/campaign/*` Stack screens.
- `apps/mobile/src/app/profile/artist/dashboard/promotion.tsx` — redesigned Stitch screen 1.
- `apps/mobile/scripts/verify-promotions-mock.mjs` — assertions for `PROMO_PACKAGES` and the new optional fields.
- `apps/mobile/scripts/verify-dashboard-routes.mjs` — existence checks for the 7 new route files.
- `apps/mobile/scripts/verify-routes.mjs` — cold-export content expectations for the 7 new routes + updated expectation for `profile/artist/dashboard/promotion.html`.
- `apps/mobile/package.json` — add `verify-campaign-store.mjs` to the `test` script chain.

---

## Task 1: `campaign-store.ts` + its verify script (TDD)

**Files:**
- Create: `apps/mobile/src/state/campaign-store.ts`
- Create: `apps/mobile/scripts/verify-campaign-store.mjs`
- Modify: `apps/mobile/package.json:57` (the `test` script — insert `&& tsx scripts/verify-campaign-store.mjs` right after the existing `&& tsx scripts/verify-promotions-mock.mjs`)

**Interfaces:**
- Produces: `useCampaignStore` with state `{ trackId?: TrackId; packageId?: string; targetGenreIds: string[]; geoScope: 'all' | 'bishkek' | 'bishkek-osh' | 'custom'; stage: CampaignStage; launched: LaunchedCampaign[] }` and actions `startCampaign(trackId), selectPackage(packageId), toggleGenre(genreId), setGeoScope(scope), goToSetup(), goToConfirm(), confirm(): Promise<void>, reset()`.
- `CampaignStage = 'selectingTrack' | 'selectingPackage' | 'settingUp' | 'confirming' | 'processing' | 'success'`.
- `LaunchedCampaign = { id: string; trackId: TrackId; packageId: string; genreIds: string[]; geoScope: string; createdAt: string }` — every later task (confirm.tsx, success.tsx) reads `launched[0]` as "the campaign just created".
- Consumes: `PROMO_PACKAGES` (Task 2) only for id validation shape — the store itself stores ids/strings, not full objects (screens resolve ids to data, same as `promotion.tsx` already does for `campaignTrackId` today).

- [ ] **Step 1: Write the store**

```typescript
// apps/mobile/src/state/campaign-store.ts
import { create } from 'zustand';

import type { TrackId } from '@/mocks';

export type CampaignStage = 'selectingTrack' | 'selectingPackage' | 'settingUp' | 'confirming' | 'processing' | 'success';

export type GeoScope = 'all' | 'bishkek' | 'bishkek-osh' | 'custom';

export type LaunchedCampaign = {
  id: string;
  trackId: TrackId;
  packageId: string;
  genreIds: string[];
  geoScope: GeoScope;
  createdAt: string;
};

/**
 * Local-only Campaign Creation wizard state (Artist Dashboard → Promotion,
 * Stitch "mmusic_studio" / Choose Music → Choose Package → Campaign Setup →
 * Campaign Preview & Payment). Same shape and honesty policy as
 * `support-store.ts`: stage transitions and the `launched` list are real
 * local mutations read by every screen in the flow; `confirm()` awaits a
 * local `setTimeout` standing in for a future real "submit campaign to
 * moderation" call — see the comment at that call site for exactly where to
 * swap it in. No MBANK charge, no moderation pipeline, no algorithmic
 * delivery is implemented (same unresolved OQ-10 scope as the Support flow).
 */
type CampaignState = {
  trackId?: TrackId;
  packageId?: string;
  targetGenreIds: string[];
  geoScope: GeoScope;
  stage: CampaignStage;
  launched: LaunchedCampaign[];

  startCampaign: (trackId: TrackId) => void;
  selectPackage: (packageId: string) => void;
  toggleGenre: (genreId: string) => void;
  setGeoScope: (scope: GeoScope) => void;
  goToSetup: () => void;
  goToConfirm: () => void;
  confirm: () => Promise<void>;
  reset: () => void;
};

export const useCampaignStore = create<CampaignState>((set, get) => ({
  trackId: undefined,
  packageId: undefined,
  targetGenreIds: [],
  geoScope: 'all',
  stage: 'selectingTrack',
  launched: [],

  startCampaign: (trackId) =>
    set({ trackId, packageId: undefined, targetGenreIds: [], geoScope: 'all', stage: 'selectingPackage' }),

  selectPackage: (packageId) => set({ packageId, stage: 'settingUp' }),

  toggleGenre: (genreId) =>
    set((state) => ({
      targetGenreIds: state.targetGenreIds.includes(genreId)
        ? state.targetGenreIds.filter((id) => id !== genreId)
        : [...state.targetGenreIds, genreId],
    })),

  setGeoScope: (scope) => set({ geoScope: scope }),

  goToSetup: () => set({ stage: 'settingUp' }),

  goToConfirm: () => set({ stage: 'confirming' }),

  confirm: async () => {
    const { trackId, packageId, targetGenreIds, geoScope } = get();
    if (!trackId || !packageId) return;
    set({ stage: 'processing' });

    // Local-only simulated delay standing in for a future real "submit to
    // moderation" call. Replace this `setTimeout` with that call — keep
    // awaiting it, then keep the success transition below unchanged.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const entry: LaunchedCampaign = {
      id: `camp-${Date.now()}`,
      trackId,
      packageId,
      genreIds: targetGenreIds,
      geoScope,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ stage: 'success', launched: [entry, ...state.launched] }));
  },

  reset: () => set({ trackId: undefined, packageId: undefined, targetGenreIds: [], geoScope: 'all', stage: 'selectingTrack' }),
}));
```

- [ ] **Step 2: Write the verify script**

```javascript
#!/usr/bin/env node
/**
 * Campaign Creation wizard state (src/state/campaign-store.ts). Exercises the
 * real store module directly via `tsx`, same approach as
 * scripts/verify-support-store.mjs. Usage: npx tsx scripts/verify-campaign-store.mjs
 */
import { useCampaignStore } from '../src/state/campaign-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('starts in the selectingTrack stage with nothing selected', useCampaignStore.getState().stage === 'selectingTrack' && useCampaignStore.getState().trackId === undefined);

useCampaignStore.getState().startCampaign('midnight-mirage');
check('startCampaign() sets the track', useCampaignStore.getState().trackId === 'midnight-mirage');
check('startCampaign() advances to selectingPackage', useCampaignStore.getState().stage === 'selectingPackage');
check('startCampaign() clears any previous package', useCampaignStore.getState().packageId === undefined);

useCampaignStore.getState().selectPackage('pro');
check('selectPackage() sets the package', useCampaignStore.getState().packageId === 'pro');
check('selectPackage() advances to settingUp', useCampaignStore.getState().stage === 'settingUp');

useCampaignStore.getState().toggleGenre('electronic-dance');
check('toggleGenre() adds a genre', useCampaignStore.getState().targetGenreIds.includes('electronic-dance'));
useCampaignStore.getState().toggleGenre('electronic-dance');
check('toggleGenre() again removes it', !useCampaignStore.getState().targetGenreIds.includes('electronic-dance'));
useCampaignStore.getState().toggleGenre('chill-lofi');

useCampaignStore.getState().setGeoScope('bishkek');
check('setGeoScope() sets the scope', useCampaignStore.getState().geoScope === 'bishkek');

useCampaignStore.getState().goToConfirm();
check('goToConfirm() advances the stage', useCampaignStore.getState().stage === 'confirming');

const launchedBefore = useCampaignStore.getState().launched.length;
await useCampaignStore.getState().confirm();
check('confirm() advances the stage to success', useCampaignStore.getState().stage === 'success');
check('confirm() appends exactly one launched campaign', useCampaignStore.getState().launched.length === launchedBefore + 1);

const newest = useCampaignStore.getState().launched[0];
check('the new entry records the right track', newest?.trackId === 'midnight-mirage');
check('the new entry records the right package', newest?.packageId === 'pro');
check('the new entry records the selected genre', newest?.genreIds.includes('chill-lofi'));
check('the new entry records the geo scope', newest?.geoScope === 'bishkek');

useCampaignStore.getState().reset();
check('reset() clears the track', useCampaignStore.getState().trackId === undefined);
check('reset() clears the package', useCampaignStore.getState().packageId === undefined);
check('reset() returns to selectingTrack', useCampaignStore.getState().stage === 'selectingTrack');

// confirm() is a no-op without both a track and a package selected.
const launchedBeforeNoOp = useCampaignStore.getState().launched.length;
await useCampaignStore.getState().confirm();
check('confirm() without a track/package selected does not record a campaign', useCampaignStore.getState().launched.length === launchedBeforeNoOp);

if (failures > 0) {
  console.error(`\n${failures} campaign-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll campaign-store checks passed.');
```

- [ ] **Step 3: Run it to verify it currently fails (store doesn't exist yet)**

Run: `npx tsx scripts/verify-campaign-store.mjs` (from `apps/mobile`)
Expected: FAIL — `Cannot find module '../src/state/campaign-store.ts'`

- [ ] **Step 4: Create the store file (Step 1's content), then re-run**

Run: `npx tsx scripts/verify-campaign-store.mjs`
Expected: `All campaign-store checks passed.`

- [ ] **Step 5: Wire it into `npm test`**

Edit `apps/mobile/package.json`'s `test` script to add `&& tsx scripts/verify-campaign-store.mjs` immediately after `&& tsx scripts/verify-promotions-mock.mjs`.

---

## Task 2: Extend `mocks/promotions.ts` + its verify script

**Files:**
- Modify: `apps/mobile/src/mocks/promotions.ts`
- Modify: `apps/mobile/scripts/verify-promotions-mock.mjs`

**Interfaces:**
- Produces: `PROMO_PACKAGES: PromoPackage[]` with `PromoPackage = { id: string; name: string; badge?: LocalizedText; priceKgs: number; durationDays: number; forecastLabel: LocalizedText; forecastLow: number; forecastHigh: number; perDayLabel?: LocalizedText; features: LocalizedText[]; highlighted?: boolean }`. `id`s: `'start' | 'boost' | 'pro' | 'spotlight'`, in that ascending-price order (Task 1's `confirm` test uses `'pro'`).
- Produces: `ActiveCampaign` gains optional `geoBreakdown?: { regionLabel: LocalizedText; pct: number; count: number }[]` and `playlistSaves?: number` and `profileVisits?: number`.
- Produces: `CampaignHistoryEntry` gains optional `budgetKgs?: number` and `formatBadge?: LocalizedText`.
- Consumes: `LocalizedText` from `@/lib/dashboard-i18n` (already imported in this file).

- [ ] **Step 1: Add `PROMO_PACKAGES` (with numeric `forecastLow`/`forecastHigh` so Tasks 8–9 never re-parse numbers out of localized strings) and extend the two existing types**

Append to `apps/mobile/src/mocks/promotions.ts` (after the existing `CAMPAIGN_HISTORY` export):

```typescript
export type PromoPackage = {
  id: 'start' | 'boost' | 'pro' | 'spotlight';
  name: string;
  badge?: LocalizedText;
  priceKgs: number;
  durationDays: number;
  forecastLabel: LocalizedText;
  forecastLow: number;
  forecastHigh: number;
  perDayLabel?: LocalizedText;
  features: LocalizedText[];
  highlighted?: boolean;
};

/**
 * Promotion package tiers (Stitch "Choose Promotion Package", Фаза artist
 * promotion flow). Separate axis from PROMO_TOOLS (thematic boost types,
 * still shown nowhere else) — these are the 4 priced plans a campaign is
 * actually launched under. Forecast ranges are explicitly framed as
 * illustrative in the UI copy (Stitch's own disclaimer), never a guarantee.
 */
export const PROMO_PACKAGES: PromoPackage[] = [
  {
    id: 'start',
    name: 'START',
    badge: { en: 'Basic start', ru: 'Базовый старт' },
    priceKgs: 0,
    durationDays: 0,
    forecastLabel: { en: 'Standard release stats in Mmusic Studio', ru: 'Стандартная статистика релизов в Mmusic Studio' },
    forecastLow: 0,
    forecastHigh: 0,
    features: [
      { en: 'Basic inclusion in algorithmic search', ru: 'Базовое попадание в алгоритмический поиск' },
      { en: 'Organic distribution across playlists', ru: 'Органическая дистрибуция по плейлистам' },
      { en: 'Standard release stats in Mmusic Studio', ru: 'Стандартная статистика релизов в Mmusic Studio' },
    ],
  },
  {
    id: 'boost',
    name: 'BOOST',
    badge: { en: 'Popular choice', ru: 'Популярный выбор' },
    priceKgs: 500,
    durationDays: 7,
    forecastLabel: { en: '~8,000 – 12,000 impressions', ru: '~8 000 – 12 000 показов' },
    forecastLow: 8000,
    forecastHigh: 12000,
    perDayLabel: { en: '71 сом / day', ru: '71 сом / день' },
    features: [
      { en: 'Priority placement in "Fresh Releases"', ru: 'Приоритет в разделе «Свежие релизы»' },
      { en: "Targeting by your listeners' 3 favorite genres", ru: 'Таргетинг по 3 любимым жанрам слушателей' },
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    badge: { en: 'Best for a single', ru: 'Оптимальный для сингла' },
    priceKgs: 900,
    durationDays: 14,
    forecastLabel: { en: '~20,000 – 30,000 impressions', ru: '~20 000 – 30 000 показов' },
    forecastLow: 20000,
    forecastHigh: 30000,
    perDayLabel: { en: '64 сом / day', ru: '64 сом / день' },
    features: [
      { en: 'High weight in algorithmic "For You" mixes', ru: 'Высокий вес в алгоритмических миксах «For You»' },
      { en: 'Targeting by city: Bishkek, Osh, Jalal-Abad', ru: 'Таргетинг по городам: Бишкек, Ош, Джалал-Абад' },
      { en: 'Extended save-to-library conversion analytics', ru: 'Расширенная аналитика конверсий в сохранения' },
    ],
    highlighted: true,
  },
  {
    id: 'spotlight',
    name: 'SPOTLIGHT',
    badge: { en: 'Flagship campaign tier', ru: 'Хит флагманской кампании' },
    priceKgs: 1300,
    durationDays: 30,
    forecastLabel: { en: '50,000 – 75,000 impressions', ru: '50 000 – 75 000 показов' },
    forecastLow: 50000,
    forecastHigh: 75000,
    perDayLabel: { en: '43 сом / day', ru: '43 сом / день' },
    features: [
      { en: 'Highest priority across all Mmusic recommendations', ru: 'Наивысший приоритет во всех рекомендациях Mmusic' },
      { en: 'Exclusive rotation in home page promo blocks', ru: 'Эксклюзивная ротация в промо-блоках на главной странице' },
      { en: 'Deep socio-demographic listener profile', ru: 'Глубокий социо-демографический портрет слушателя' },
    ],
    highlighted: true,
  },
];
```

Then change the `ActiveCampaign` type to:

```typescript
export type ActiveCampaign = {
  trackId: string;
  dayOfTotal: LocalizedText;
  reach: number;
  reachGoal: number;
  conversionRatePct: number;
  newFollowers: number;
  progressPct: number;
  geoBreakdown?: { regionLabel: LocalizedText; pct: number; count: number }[];
  playlistSaves?: number;
  profileVisits?: number;
};
```

and add to the existing `ACTIVE_CAMPAIGN` object literal (keep every existing field's value unchanged):

```typescript
  geoBreakdown: [
    { regionLabel: { en: 'Bishkek (capital & clubs)', ru: 'Бишкек (Столица и клубы)' }, pct: 42, count: 5208 },
    { regionLabel: { en: 'Osh & southern region', ru: 'Ош и Южный регион' }, pct: 26, count: 3224 },
    { regionLabel: { en: 'Almaty & Astana (recommended feed)', ru: 'Алматы и Астана (Реком. фид)' }, pct: 19, count: 2356 },
  ],
  playlistSaves: 412,
  profileVisits: 198,
```

(`count` values are `reach * pct / 100` rounded, kept consistent with the existing `reach: 12400`.)

Change `CampaignHistoryEntry` to:

```typescript
export type CampaignHistoryEntry = { id: string; trackTitle: string; metric: LocalizedText; completedLabel: LocalizedText; reach: number; budgetKgs?: number; formatBadge?: LocalizedText };
```

and add to each of the 2 existing `CAMPAIGN_HISTORY` entries: `budgetKgs: 900, formatBadge: { en: 'Single', ru: 'Сингл' }` (hist-vapor-trails) and `budgetKgs: 1200, formatBadge: { en: 'Album', ru: 'Релиз' }` (hist-horizon).

- [ ] **Step 2: Extend the verify script**

Change the import line in `apps/mobile/scripts/verify-promotions-mock.mjs` to:

```javascript
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_PACKAGES, PROMO_TOOLS } from '../src/mocks/promotions.ts';
```

and append, before the final `if (failures > 0)` block:

```javascript
check('exactly 4 promo packages (START/BOOST/PRO/SPOTLIGHT)', PROMO_PACKAGES.length === 4);
check('every promo package has a unique id', new Set(PROMO_PACKAGES.map((p) => p.id)).size === PROMO_PACKAGES.length);
check('promo package prices strictly increase with id order', PROMO_PACKAGES.every((p, i) => i === 0 || p.priceKgs > PROMO_PACKAGES[i - 1].priceKgs));
check('the free tier is priced at 0', PROMO_PACKAGES[0].priceKgs === 0);
check(
  'every promo package has a localized forecastLabel and at least one localized feature',
  PROMO_PACKAGES.every(
    (p) => p.forecastLabel.en.length > 0 && p.forecastLabel.ru.length > 0 && p.features.length > 0 && p.features.every((f) => f.en.length > 0 && f.ru.length > 0),
  ),
);
check('every promo package forecastHigh is >= forecastLow', PROMO_PACKAGES.every((p) => p.forecastHigh >= p.forecastLow));

check('active campaign geoBreakdown percentages sum to 100 or less', !ACTIVE_CAMPAIGN.geoBreakdown || ACTIVE_CAMPAIGN.geoBreakdown.reduce((sum, g) => sum + g.pct, 0) <= 100);
check(
  'active campaign geoBreakdown counts are consistent with reach and pct (±1 rounding)',
  !ACTIVE_CAMPAIGN.geoBreakdown ||
    ACTIVE_CAMPAIGN.geoBreakdown.every((g) => Math.abs(g.count - Math.round((ACTIVE_CAMPAIGN.reach * g.pct) / 100)) <= 1),
);
```

- [ ] **Step 3: Run it**

Run: `npx tsx scripts/verify-promotions-mock.mjs` (from `apps/mobile`)
Expected: `All promotions-mock checks passed.`

---

## Task 3: Dashboard i18n keys

**Files:**
- Modify: `apps/mobile/src/lib/dashboard-i18n.ts`

**Interfaces:**
- Produces: every `DashboardStringKey` listed below, in both `en` and `ru` blocks. Every screen task below consumes these exact key names via `t('keyName')`.

- [ ] **Step 1: Add the following keys to both the `en` and `ru` blocks of `DASHBOARD_STRINGS`** (insert near the existing `promotionTools`/`createCampaign`/`launchViaMbank` keys so the Promotion section of the file stays together):

```
stepOf, chooseTrackTitle, chooseTrackSubtitle, searchTrackPlaceholder, selectedLabel, continueLabel,
noPublishedTracksTitle, noPublishedTracksBody, choosePackageTitle, changeLabel, perDayAbbr,
packageDetailsCta, selectPackageForPriceLabel, forecastDisclaimerLabel, campaignSetupTitle,
wholeCountryLabel, allRegionsLabel, bishkekOnlyLabel, capitalClusterLabel, bishkekOshLabel,
majorHubsLabel, includedLocationsAllLabel, includedLocationsBishkekLabel, includedLocationsBishkekOshLabel,
genresAndPreferencesLabel, reachForecastLabel, liveAiLabel, campaignTotalLabel, proceedToPaymentLabel,
daysSuffixLabel, audienceAndTargetingLabel, tariffCostLabel, totalToPayLabel, payPackageViaMbankLabel,
campaignDemoNoticeLabel, campaignCreatedTitle, campaignCreatedBody, nothingJustLaunchedLabel,
viewCampaignAnalyticsLabel, backToStudioDashboardLabel, campaignAnalyticsTitle, planTierLabel,
daysRemainingLabel, listenersLabel, conversionRateShortLabel, playlistSavesLabel, profileVisitsLabel,
extendCampaignLabel, editAudienceLabel, pauseShowLabel, actionUnavailableToast, thirtyDaySummaryLabel,
audienceReachLabel, toFansLabel, inRotationCountLabel, investmentLabel, listenerGeographyLabel,
promoteYourTrackHeadline, promoteYourTrackBody, promoteMusicCta, startFromPriceLabel, createNewCampaignCta,
detailedStatisticsLabel
```

For exact copy, mirror the Stitch screenshots' Russian text where one exists (e.g. `chooseTrackTitle: 'Choose Music To Promote'` / `'Выберите музыку для продвижения'`, `choosePackageTitle: 'Choose Promotion Package'` / `'Выберите пакет продвижения'`) and write a natural, differing English translation for each — do not copy-paste the Russian into the English slot (`verify-dashboard-i18n.mjs` asserts `en !== ru` per key). For the honesty-policy strings, follow the existing `demoNoMoneySentLabel` precedent exactly:

```
en.campaignDemoNoticeLabel: 'Demo campaign — no real charge is made and nothing is submitted for review'
ru.campaignDemoNoticeLabel: 'Демо-кампания — реальная оплата не производится, трек никуда не отправляется'
en.actionUnavailableToast: "This action isn't available in this preview"
ru.actionUnavailableToast: 'Это действие недоступно в этом демо'
```

- [ ] **Step 2: Run the i18n verify script**

Run: `npx tsx scripts/verify-dashboard-i18n.mjs` (from `apps/mobile`)
Expected: `All dashboard-i18n checks passed.` (catches any missing/empty/duplicate-across-locale key immediately)

---

## Task 4: Register the campaign routes

**Files:**
- Modify: `apps/mobile/src/app/profile/_layout.tsx`
- Modify: `apps/mobile/scripts/verify-dashboard-routes.mjs`

**Interfaces:**
- Produces: the routes `/profile/artist/campaign/select-track`, `/profile/artist/campaign/select-package`, `/profile/artist/campaign/package-details`, `/profile/artist/campaign/setup`, `/profile/artist/campaign/confirm`, `/profile/artist/campaign/success`, `/profile/artist/campaign/statistics` — every screen task below `router.push`/`router.replace`s to these exact paths.

- [ ] **Step 1: Add the 7 new `Stack.Screen` entries**, right after the existing `artist/dashboard` entry in `apps/mobile/src/app/profile/_layout.tsx`:

```tsx
      <Stack.Screen name="artist/campaign/select-track" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/select-package" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/package-details" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="artist/campaign/setup" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/confirm" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/success" options={{ headerShown: false }} />
      <Stack.Screen name="artist/campaign/statistics" options={{ headerShown: false }} />
```

(`headerShown: false` because, like every other Stitch screen in this app, each new screen draws its own in-content header with a back/close `IconButton` — see Task 5+.)

- [ ] **Step 2: Add existence checks**

Append to `apps/mobile/scripts/verify-dashboard-routes.mjs` before the `if (failures > 0)` block:

```javascript
for (const name of ['select-track', 'select-package', 'package-details', 'setup', 'confirm', 'success', 'statistics']) {
  check(`artist/campaign/${name}.tsx exists`, existsSync(join(APP, 'profile', 'artist', 'campaign', `${name}.tsx`)));
}
```

- [ ] **Step 3: Run it**

Run: `npx tsx scripts/verify-dashboard-routes.mjs` (from `apps/mobile`)
Expected: FAIL at this point (screen files don't exist yet) — correct; re-run after Task 11.

---

## Task 5: `select-track.tsx` (Stitch screen 2)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/select-track.tsx`

**Interfaces:**
- Consumes: `useArtistStore((s) => s.entries)` (existing, same as `promotion.tsx`), `useCampaignStore().startCampaign(trackId)`, `useDashboardStrings()`, `Artwork`/`PillButton`/`IconButton`/`EmptyState`/`TextField` from `components/ui`, `router` from `expo-router`.
- Produces: nothing new consumed elsewhere; navigates to `/profile/artist/campaign/select-package` on continue.

- [ ] **Step 1: Implement the screen**

Reference `2./code.html` + `2./screen.png`. In-content header: `IconButton icon="arrow-back"` → `router.back()`; title `t('chooseTrackTitle')`. Step indicator: `t('stepOf')` text + a 4-segment progress bar (reuse the `progressTrack`/`progressFill` pattern already in `promotion.tsx`, filled to 25%). Subtitle: `t('chooseTrackSubtitle')`. A real `TextField` search box (`placeholder={t('searchTrackPlaceholder')}`) filtering the list client-side by title — actual working filter, not decorative. List: `entries.filter((e) => e.status === 'published')`, each row = `Artwork` (40px) + title + a real subtitle (e.g. formatted `createdAt` — there is no play-count field on `Track`, don't invent one) + a trailing selection circle (`Icon name={selected ? 'check-circle' : 'radio-button-unchecked'}`). Tapping a row sets local `useState<TrackId>` selection (don't call `startCampaign` until Continue is pressed, so back-navigation doesn't leave a half-started campaign). Empty state: if `published.length === 0`, render `EmptyState` with `t('noPublishedTracksTitle')`/`t('noPublishedTracksBody')` and no Continue button. If `published.length === 1`, pre-select it. Footer: `t('selectedLabel')` + selected title, `PillButton label={t('continueLabel')} trailingIcon="arrow-forward"` disabled while nothing is selected, calling `startCampaign(selectedId)` then `router.push('/profile/artist/campaign/select-package')`. Omit the Stitch screenshot's Albums/Profile segmented tabs and the "ХИТ РЕЛИЗА"/"НОВИНКА" badges — no album/profile-level promotion data model exists, and those badges aren't backed by any real signal.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`) — expect no new errors referencing `select-track.tsx`.

---

## Task 6: `select-package.tsx` (Stitch screen 3)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/select-package.tsx`

**Interfaces:**
- Consumes: `PROMO_PACKAGES` (Task 2), `useCampaignStore((s) => s.trackId)` (if unset, `router.replace('/profile/artist/campaign/select-track')` immediately — the "entered mid-flow" guard from Review Focus), `useCampaignStore().selectPackage(packageId)`, `useArtistStore` to resolve the selected track's title/artwork, `formatKgsAmount`.
- Produces: navigates to `/profile/artist/campaign/package-details?packageId=X` (view details) or directly to `/profile/artist/campaign/setup` (select package and continue).

- [ ] **Step 1: Implement the screen**

Reference `3./code.html` + `3./screen.png`. Header + step bar (step 2/4, 50%) as Task 5. Selected-track summary chip (artwork + title + artist, `t('changeLabel')` link → `router.back()`). One card per `PROMO_PACKAGES` entry: name + `badge` pill (`Badge` component, `variant="editorial"` for `highlighted` tiers, `variant="neutral"` otherwise), price (`formatKgsAmount(priceKgs)` + `perDayLabel` when present — `priceKgs === 0` renders `'0 сом'`, not blank), `forecastLabel`, up to 3 `features` bullets with `Icon name="check-circle-outline"`, `TextLinkButton` `t('packageDetailsCta')` → `router.push({ pathname: '/profile/artist/campaign/package-details', params: { packageId: pkg.id } })`. Tapping the card itself calls `selectPackage(pkg.id)` then `router.push('/profile/artist/campaign/setup')`. Footer: `t('forecastDisclaimerLabel')` (the Stitch design's own "демонстрационного характера" framing — keep it).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 7: `package-details.tsx` (Stitch screen 4, bottom sheet)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/package-details.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams<{ packageId?: string }>()` from `expo-router`, `PROMO_PACKAGES` (Task 2), `SheetScreen` from `components/ui` (reused as-is — same primitive `support-confirm.tsx` uses; its one `t('closeLabel')` call reads the app-wide locale table via the shared `useLocaleStore`, which is correct here too since both locale hooks share one underlying store), `useCampaignStore().selectPackage`.
- Produces: navigates to `/profile/artist/campaign/setup` on "Select package", or `goBack()` on close/backdrop tap.

- [ ] **Step 1: Implement the screen**

Reference `4._bottom_sheet/code.html` + `screen.png`. Resolve `pkg = PROMO_PACKAGES.find((p) => p.id === packageId)`; if not found (cold export with no `?packageId=`), render `SheetScreen` with just a close affordance and no package content (neutral shell, same pattern as `sheets/add-to-playlist.html`). When found: `Badge` (tier name) + title, `IconButton icon="close"` → `goBack()`; a per-day chip; selected-track summary row with `TextLinkButton` `t('changeLabel')` → `goBack()`; the **same** `pkg.features` array used on the select-package card (full list, not re-capped) — don't invent a second, longer description list (Task 2 already owns each tier's copy; extend `features` there if a tier needs more detail); `PillButton label={t('selectPackageForPriceLabel')}` (interpolate `formatKgsAmount(pkg.priceKgs)` into the rendered string) → `selectPackage(pkg.id)` then `router.replace('/profile/artist/campaign/setup')` (replace, not push — this is a details drawer, not a flow step; popping back from Setup should return to Select Package, not to this sheet).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 8: `setup.tsx` (Stitch screen 5)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/setup.tsx`

**Interfaces:**
- Consumes: `useCampaignStore((s) => ({ trackId: s.trackId, packageId: s.packageId, targetGenreIds: s.targetGenreIds, geoScope: s.geoScope }))` (if `trackId` unset, `router.replace('/profile/artist/campaign/select-track')`), `toggleGenre`/`setGeoScope`/`goToConfirm` actions, `PROMO_PACKAGES` (including Task 2's `forecastLow`/`forecastHigh`), `genres` from `@/mocks/genres` (reuse existing catalog, DRY), `useArtistStore` for the track summary row.
- Produces: navigates to `/profile/artist/campaign/confirm`.

- [ ] **Step 1: Implement the screen**

Reference `5./code.html` + `screen.png`. Header + step bar (step 3/4, 75%). Selected-track + selected-package summary card (`t('changeLabel')` → `router.back()`). **Geography**: 3 selectable cards (`t('wholeCountryLabel')`+`t('allRegionsLabel')`, `t('bishkekOnlyLabel')`+`t('capitalClusterLabel')`, `t('bishkekOshLabel')`+`t('majorHubsLabel')`) bound to `geoScope`/`setGeoScope` — omit the Stitch design's 4th "Вручную" manual-region picker (no region-list data model backs a real custom picker). Below, one of `t('includedLocationsAllLabel')`/`t('includedLocationsBishkekLabel')`/`t('includedLocationsBishkekOshLabel')` per the current `geoScope`. **Genres**: render `genres.slice(0, 6)` (`@/mocks/genres`, `Genre.id`/`Genre.title`) as toggleable rows bound to `targetGenreIds`/`toggleGenre` — omit the Stitch design's fabricated per-genre "+4.2k"/"+6.8k" reach deltas (no such per-genre number exists in the data model). **Reach Forecast card**: `t('reachForecastLabel')` + `t('liveAiLabel')` badge (kept as flavor — mirrors the Stitch design's own "Прогноз" framing, not a real-time claim) showing `${pkg.forecastLow.toLocaleString()} – ${pkg.forecastHigh.toLocaleString()}` + `t('forecastDisclaimerLabel')` (same key as Task 6 — one disclaimer, one source of truth). Footer: `t('campaignTotalLabel')` + `formatKgsAmount(pkg.priceKgs)` + `pkg.durationDays` + `t('daysSuffixLabel')`, `PillButton label={t('proceedToPaymentLabel')}` → `goToConfirm()` then `router.push('/profile/artist/campaign/confirm')`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 9: `confirm.tsx` (Stitch screen 6 — review + MBANK pay)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/confirm.tsx`

**Interfaces:**
- Consumes: full `useCampaignStore()` state (if `trackId`/`packageId` unset, `router.replace('/profile/artist/campaign/select-track')`), `PROMO_PACKAGES`, `useArtistStore`, `genres` (to render selected genre titles), `DemoNotice` from `@/components/demo-notice` (reused exactly as `support-confirm.tsx` uses it — this IS "the existing MBANK payment widget" the task asks to reuse), `PillButton`/`TextLinkButton`/`Icon`/`Artwork` from `components/ui`, `useAppStrings` from `@/state/locale-store` (for the one reused `mbankAccountMasked` key, same as `support-confirm.tsx`), `formatKgsAmount`.
- Produces: calls `confirm()` then `router.replace('/profile/artist/campaign/success')`.

- [ ] **Step 1: Implement the screen**

Reference `6._mbank_pay/code.html` + `screen.png`, but apply these honesty edits (do not port from the screenshot): drop the real-looking MBANK balance figure ("4821 (14 250 сом)"), the "+5% кешбэк" claim, the "Баланс Studio Wallet" second payment option (no wallet concept exists anywhere else in the app), the "Скидка Studio Pro (15%)"/"Комиссия экосистемы" line items (no subscription-discount or fee model exists), the "Шлюз защищен" claim, the literal date range "18 сен — 2 окт", and the footer's claimed moderation SLA. Keep: campaign summary card (track, `pkg.name` + `pkg.durationDays` + `t('daysSuffixLabel')` — not a calendar range), audience chips (`targetGenreIds` resolved to `genres` titles + the current `geoScope` label from Task 8's labels), reach-forecast mini-card (same `forecastLow`/`forecastHigh` + disclaimer as Task 8), a cost card with `t('tariffCostLabel')` → `formatKgsAmount(pkg.priceKgs)` and `t('totalToPayLabel')` → the same number (no invented discount), a payment-method row styled like `support-confirm.tsx`'s `accountCard` (reuse `t('mbankAccountMasked')` via `useAppStrings`, same as that screen — already the established masked-account copy), `DemoNotice text={t('campaignDemoNoticeLabel')}`, and:

```tsx
async function handleConfirm() {
  await confirm();
  router.replace('/profile/artist/campaign/success');
}
```

```tsx
<PillButton
  label={`${t('payPackageViaMbankLabel')} ${formatKgsAmount(pkg.priceKgs)}`}
  trailingIcon="bolt"
  loading={stage === 'processing'}
  onPress={handleConfirm}
/>
<TextLinkButton label={t('cancel') /* reuse existing dashboard key if present, else add one */} tone="muted" onPress={() => router.back()} disabled={stage === 'processing'} />
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 10: `success.tsx` (Stitch screen 7)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/success.tsx`

**Interfaces:**
- Consumes: `useCampaignStore((s) => ({ launched: s.launched, reset: s.reset }))`, `PROMO_PACKAGES`, `useArtistStore`.
- Produces: navigates to `/profile/artist/campaign/statistics` ("View analytics") or `reset()` + `router.dismissTo('/profile/artist/dashboard/promotion')` ("Back to Studio Dashboard" — mirrors `support-success.tsx`'s `handleDone`, satisfying the Review Focus "re-entering the flow resets state" case).

- [ ] **Step 1: Implement the screen**

Reference `7./code.html` + `screen.png`. Guard: if `launched.length === 0` (cold export / direct nav), render a not-found shell using `t('nothingJustLaunchedLabel')` with just a link back to the dashboard — do not fabricate a campaign. Otherwise: success icon/glow (reuse `support-success.tsx`'s `iconGlow`/`iconCircle` styles, swap the `favorite` icon for `check`), `t('campaignCreatedTitle')`, `t('campaignCreatedBody')` interpolated with the launched entry's resolved track title, a details card (`#` + `launched[0].id`, `t('planTierLabel')` + package name/duration) — **no** "На модерации · до 2 часов" moderation-SLA claim, **no** "Старт показа: Сегодня после проверки" claim; replace both with `DemoNotice text={t('campaignDemoNoticeLabel')}` (same key Task 9 uses). Drop the Stitch "Что происходит дальше?" 3-step fictional-process list entirely (same reasoning as `support-success.tsx`'s comment explicitly omitting gamification/SLA copy from its own Stitch source). CTAs: `PillButton label={t('viewCampaignAnalyticsLabel')}` → `router.push('/profile/artist/campaign/statistics')`; `TextLinkButton label={t('backToStudioDashboardLabel')}` → `reset()` then `router.dismissTo('/profile/artist/dashboard/promotion')`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 11: `statistics.tsx` (Stitch screen 8)

**Files:**
- Create: `apps/mobile/src/app/profile/artist/campaign/statistics.tsx`

**Interfaces:**
- Consumes: `ACTIVE_CAMPAIGN`, `CAMPAIGN_HISTORY` (existing fields, untouched) plus Task 2's new `geoBreakdown`/`playlistSaves`/`profileVisits`; `useArtistStore`; `useToast` (existing hook, same as current `promotion.tsx`).
- Produces: a small exported `GeoBreakdownRow` function component (see Step 1) that Task 13 also imports — this is the one piece of markup intentionally shared between the Statistics screen and the redesigned Dashboard.

- [ ] **Step 1: Implement the screen**

Reference `8./code.html` + `screen.png`, same honesty edits as prior tasks. Header: `IconButton icon="arrow-back"` → `router.back()`, title `t('campaignAnalyticsTitle')`, two `IconButton`s (`share`/`file-download`) that both call `showToast(t('actionUnavailableToast'))` — real, working buttons with an honest outcome (same convention as the existing `launchCampaignToast`). Campaign header card: `ACTIVE_CAMPAIGN`-driven (artwork via `useArtistStore` track lookup, `dayOfTotal`, `reach`/`reachGoal` + `progressPct` bar — reuse `promotion.tsx`'s existing `progressTrack`/`progressFill` styles verbatim). `t('daysRemainingLabel')` computed as `totalDays - currentDay` parsed from `dayOfTotal`, **not** a calendar date. Stat grid: 4× `StatCard` for `reach` (label `t('listenersLabel')`), `conversionRatePct` (label `t('conversionRateShortLabel')`), `playlistSaves` (label `t('playlistSavesLabel')`), `profileVisits` (label `t('profileVisitsLabel')`) — all real fields from Task 2, no invented numbers. **Dynamics**: a simplified static trend — e.g. 4 bars (`View`s, height set via style from a short fixed array interpolating up to `reach`) labeled "День 1…Сегодня" — an intentional scope reduction from the Stitch mock's interactive tabbed SVG line chart (no `react-native-svg` path work for this decorative element). **Geography & audience card**: extract and export this function component for reuse by Task 13:

```tsx
export function GeoBreakdownRow({ regionLabel, pct, count }: { regionLabel: string; pct: number; count: number }) {
  return (
    <View style={geoStyles.row}>
      <View style={geoStyles.labelRow}>
        <ThemedText variant="body-sm">{regionLabel}</ThemedText>
        <ThemedText variant="label-lg">{pct}% ({count.toLocaleString('en-US')})</ThemedText>
      </View>
      <View style={geoStyles.track}>
        <View style={[geoStyles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}
```

(`geoStyles` mirrors `promotion.tsx`'s existing `progressTrack`/`progressFill` pair.) Map `ACTIVE_CAMPAIGN.geoBreakdown` through it. **Campaign management card**: 3 rows (`t('extendCampaignLabel')`/`t('editAudienceLabel')`/`t('pauseShowLabel')` — simplify `extendCampaignLabel`'s copy to not state a specific discount percentage, since no real discount-pricing model backs one), each calling `showToast(t('actionUnavailableToast'))` on press.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`)

---

## Task 12: Route verification expectations

**Files:**
- Modify: `apps/mobile/scripts/verify-routes.mjs`

**Interfaces:**
- Consumes: Tasks 5–11's actual cold-start fallback copy — fill in the exact strings used, don't guess generic placeholders.

- [ ] **Step 1: Add expectations**, inserted after the existing `profile/artist/dashboard/index.html` entry (around line 75) in `apps/mobile/scripts/verify-routes.mjs`:

```javascript
  { path: 'profile/artist/campaign/select-track.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Choose Track (cold export, no artist/tracks yet — renders the empty state)' },
  { path: 'profile/artist/campaign/select-package.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Choose Package (cold export, no track selected — neutral redirect shell)' },
  { path: 'profile/artist/campaign/package-details.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Package Details (cold export, no ?packageId= — neutral shell)' },
  { path: 'profile/artist/campaign/setup.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Setup (cold export, no track selected — neutral redirect shell)' },
  { path: 'profile/artist/campaign/confirm.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Confirm & Pay (cold export, no track/package selected — neutral redirect shell)' },
  { path: 'profile/artist/campaign/success.html', mustContain: [], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Success (cold export, nothing just launched — empty state)' },
  { path: 'profile/artist/campaign/statistics.html', mustContain: ['Midnight Mirage'], mustNotContain: ['PLACEHOLDER'], label: 'Campaign: Statistics (reads the existing ACTIVE_CAMPAIGN mock, always has content)' },
```

Leave every `mustContain` for the 6 redirect/empty screens as `[]` for now (matching the existing `sheets/support.html`/`search/results.html` "neutral shell" convention) **unless** Tasks 5–11 rendered a visible fallback string instead of an immediate client-side redirect — in that case, replace `[]` with that exact string (copy it verbatim from the screen file), the same way `sheets/support-confirm.html` asserts `'Nothing to confirm'`. Whichever you choose per screen, also add it to `mustNotContain` for every *other* screen's expectation in this list.

Also add one more entry for the redesigned `promotion.tsx`, right after the `profile/artist/dashboard/index.html` entry:

```javascript
  { path: 'profile/artist/dashboard/promotion.html', mustContain: ['No artist profile yet', 'Set up your artist profile to start uploading tracks.'], mustNotContain: ['PLACEHOLDER'], label: 'Artist Dashboard Promotion tab (same cold-export empty state as Overview — no local artist yet)' },
```

Confirm this exact `mustContain` pair against what `promotion.tsx` actually renders with no artist set up once Task 13 is done (reuse `dashboard/index.tsx`'s existing `EmptyState` copy verbatim if `promotion.tsx` shows the same state, which it should — neither Overview nor Promotion has anything to show before `useArtistStore().artist` exists).

- [ ] **Step 2: Run the full route verification build**

Run: `node scripts/verify-routes.mjs` (from `apps/mobile`) — runs a real `expo export --platform web`, so it also catches any crash across all 7 new screens.
Expected: all expectations pass, script exits 0.

---

## Task 13: Redesign `promotion.tsx` (Stitch screen 1 — the dashboard)

**Files:**
- Modify: `apps/mobile/src/app/profile/artist/dashboard/promotion.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–4 (`useCampaignStore().startCampaign`, `PROMO_PACKAGES`, the new `ACTIVE_CAMPAIGN` fields, all Task 3 i18n keys), `GeoBreakdownRow` from `./  ../campaign/statistics` (Task 11) if importing a screen file proves clean — otherwise extract `GeoBreakdownRow` into `src/components/dashboard/geo-breakdown-row.tsx` instead and have both this file and Task 11 import from there (prefer this if cross-route imports cause any bundler/route-table issue), plus every existing import already in this file (`useArtistStore`, `ACTIVE_CAMPAIGN`, `CAMPAIGN_HISTORY`, `useToast`, `formatKgsAmount`).
- Produces: `router.push('/profile/artist/campaign/select-track')`, called from both the hero CTA and the bottom "Create new campaign" CTA — the flow's entry point.

- [ ] **Step 1: Implement the redesign**

Reference `1._mmusic_studio/code.html` + `screen.png`, with these deliberate omissions: no "Баланс промо-кошелька" wallet card (no wallet concept exists anywhere else in the app); no second bottom tab bar from the Stitch mock (the real `DashboardTabBar`, rendered by the untouched `dashboard/_layout.tsx`, already provides this).

Keep the existing `ThemedView surface="canvas"` + `ScrollView` shell. Replace the body with, top to bottom:
1. Hero promo card (`t('promoteYourTrackHeadline')`/`t('promoteYourTrackBody')`/`PillButton label={t('promoteMusicCta')}` + `t('startFromPriceLabel')`) → `router.push('/profile/artist/campaign/select-track')`. Only render if `published.length > 0`.
2. 30-day summary: 4× `StatCard` using `t('audienceReachLabel')`/`t('toFansLabel')`/`t('inRotationCountLabel')`/`t('investmentLabel')`. Reuse `ACTIVE_CAMPAIGN.reach`/`conversionRatePct` directly for the first two (don't invent a second, different "30-day reach" number that contradicts the active-campaign card right below it); `CAMPAIGN_HISTORY.length > 0 ? 1 : 0` for "in rotation"; `CAMPAIGN_HISTORY.reduce((sum, h) => sum + (h.budgetKgs ?? 0), 0)` formatted via `formatKgsAmount` for "investment".
3. Active campaign card: keep this section's existing logic exactly (current lines ~34–58), add a `TextLinkButton label={t('detailedStatisticsLabel')}` → `router.push('/profile/artist/campaign/statistics')` and a pause `IconButton icon="pause"` → `showToast(t('actionUnavailableToast'))`.
4. Listener geography: if `ACTIVE_CAMPAIGN.geoBreakdown` is set, map it through `GeoBreakdownRow` (shared with Task 11 — see Interfaces above for where it lives).
5. History: keep the existing `CAMPAIGN_HISTORY.map(...)` loop exactly, optionally adding `formatBadge` as a `Badge` next to each title — pure visual addition, no behavior change.
6. Remove the current inline "Promotion tools" (`PROMO_TOOLS.map`) and "Create a new campaign" (`BUDGETS`/`Chip`/`launchViaMbank` toast) sections entirely — replaced by the hero CTA, which now leads into the real flow instead of a disabled toast. Remove the now-unused `PROMO_TOOLS`/`BUDGETS` imports from this file (both stay exported, untouched, from `mocks/promotions.ts`).
7. Bottom CTA: `PillButton label={t('createNewCampaignCta')} leadingIcon="add"` → same `router.push('/profile/artist/campaign/select-track')` as the hero card.

Update the file's top comment from the current `"No real campaign ever launches — 'Launch via MBANK' is explicitly disabled, same honest pattern as the listener Support flow."` to:

```tsx
/** Artist Dashboard — Promotion tab (Stitch "mmusic_studio"). Entry point into
 * the local Campaign Creation wizard (state/campaign-store.ts) — the wizard
 * really runs end-to-end and really records a LaunchedCampaign, but "Pay via
 * MBANK" never calls a real payment API and no real moderation/delivery
 * happens, same honest pattern as the listener Support flow. */
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` (from `apps/mobile`) — expect no errors.

---

## Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test` (from `apps/mobile`) — runs every `verify-*.mjs` script in order, including the real `expo export --platform web` build and the two new store/mock scripts.
Expected: every check prints `✓ OK`, every script prints its final "All ... checks passed." line, exit code 0.

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `npx tsc --noEmit && npm run lint` (from `apps/mobile`)
Expected: no errors.

- [ ] **Step 3: Start the dev server for a manual visual pass**

Run: `npx expo start --web` — ask the user's permission first if this session hasn't already started it (this plan's own Global Constraints + the `stitch-react-native` skill's Phase-4 gate both call for confirmation before starting a packager). Visually walk the full flow (track → package → details sheet → setup → confirm/pay → success → statistics) at an iPhone viewport width and at desktop width (the user's stated "responsive on iPhone and desktop" requirement). Fix any clipping/misalignment directly in the relevant screen file from Tasks 5–11, re-running that task's typecheck step after each fix.

- [ ] **Step 4: Report the local preview URL to the user**

`expo start --web` prints a `http://localhost:PORT` URL — give this to the user for their own review, per their explicit request. Do not commit, push, merge, or deploy.

---

## Execution Notes

This plan is executed **natively, in the same session that wrote it** (not handed to a fresh subagent per task): the research phase that produced this plan (reading every existing Promotion/Support file, every Stitch screenshot, the design-tokens package, and every `verify-*.mjs` convention) is already loaded in context, and re-deriving it in a fresh subagent per task would cost more than it saves. A single capable reviewer pass (Task 14 plus a final `code-review` pass over the full diff) replaces the per-task fresh-reviewer cycle `subagent-driven-development` would otherwise provide.
