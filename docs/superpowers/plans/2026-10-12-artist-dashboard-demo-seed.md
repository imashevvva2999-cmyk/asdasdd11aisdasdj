# Artist Dashboard Demo Population Implementation Plan

> **STATUS: APPROVED FOR IMPLEMENTATION (2026-10-12), execute FIRST** — before the Kyrgyz track catalog plan. Subagent-driven development with independent per-task review. Local only — no push/merge/deploy without separate approval.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a fully populated, honestly-labeled Artist Dashboard for the demo, reached through the existing Become an Artist flow, by (1) walking the real onboarding + upload UI to create genuine published releases, and (2) two small code changes that close the two remaining hardcoded-zero gaps (Support card, listener/stream stats) without fabricating real-artist statistics.

**Architecture:** No new screens or stores beyond one dev-only route. The dashboard, Become an Artist flow, and all 4 tabs (`apps/mobile/src/app/profile/artist/dashboard/*`) already exist and work. This plan adds: a documented manual walkthrough (no code) to produce real `ArtistTrackEntry` records via `useArtistStore`; a fix wiring the Support stat card to `useSupportStore`'s real history instead of a hardcoded literal; and a new dev-only route (same pattern as the existing `dev-ui-kit.tsx`) that calls one new, clearly-commented `useArtistStore` action to set realistic demo numbers on the current session's local artist.

**Tech Stack:** TypeScript, React Native/Expo, Zustand (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-12-mmusic-demo-prep-design.md`

## Global Constraints

- **This project has no test framework (no Jest/Vitest).** Verification is a set of standalone `scripts/verify-*.mjs` files, run via `tsx`, using a local `check(label, condition)` helper and `process.exit(1)` on any failure — see `apps/mobile/scripts/verify-artist-store.mjs` for the exact pattern this plan's tasks follow. Every new verify script gets a `"verify:<name>"` entry in `apps/mobile/package.json`'s `scripts` block and is appended to the `"test"` script's `&&`-chain. Scripts import project source via relative paths (`'../src/state/artist-store.ts'`), not the `@/` alias.
- The local artist is always `id: 'me'` (`artist-store.ts:35`) — there is exactly one artist this flow can create per session. This plan does not add multi-artist support.
- No fabricated numbers are attributed to any of the catalog's existing fictional artists (Solaris Echo, Kaelen, etc.) — only the demo session's own local `'me'` artist gets seeded.
- The new dev route must follow `dev-ui-kit.tsx`'s existing pattern: `__DEV__`-gated, rendering `<NotFoundScreen />` otherwise, so it is automatically absent from production and from `scripts/web-postexport.mjs`'s stripped export.
- Do not touch the Analytics tab's known hardcoded-fallback-`trackId` behavior (accepted residual gap from the prior integration project) — avoid triggering it by giving the seeded published tracks real, distinct ids (not reusing any id Analytics' mock already special-cases).
- Do not reconcile the dashboard's tabbed layout vs. `docs/screens.md`'s "plain stack" description (OQ-51) — out of scope.

## Review Focus

- Calling the new seed action before an artist profile exists (`artist === undefined`) must not crash — Task 2's action is a no-op if there's no current artist, same guard pattern as the rest of `artist-store.ts`.
- Running the Support-card fix with zero `SupportHistoryEntry` rows for the current artist (the common case right after profile creation, before the walkthrough's donation step) must render "0 сом", not `NaN` or a crash — Task 1's sum defaults to 0 on an empty array.
- Summing `SupportHistoryEntry.amount` must only include entries whose `artistId` matches the *current* artist, not the whole `initialSupportHistory` array (which has entries for `solaris-echo`/`kaelen`/`maya-lin`) — Task 1's filter is scoped per artist id, verified by a test using a non-`'me'` artist id too.
- The walkthrough script (Task 3) publishing 3 tracks relies on `publishTrack`'s two `setTimeout`s (600ms + 900ms each) resolving in the UI — a screenshot or verification taken before ~1.5s per track would still show "Uploading"/"Transcoding", not "Published"; Task 3's steps call this out explicitly with wait instructions.
- Re-running the seed action a second time in the same session (e.g. operator double-taps the dev button) must not double-count — Task 2's action sets absolute values, not increments.

---

## Task 1: Wire the Support stat card to real donation history

**Files:**
- Modify: `apps/mobile/src/app/profile/artist/dashboard/index.tsx:106-110`
- Create: `apps/mobile/src/lib/artist-support-total.ts`
- Create: `apps/mobile/scripts/verify-artist-support-total.mjs` (new — see Global Constraints: no Jest/Vitest in this project)
- Modify: `apps/mobile/package.json` (register the new verify script)

**Interfaces:**
- Consumes: `useSupportStore((s) => s.history)` (`SupportHistoryEntry[]`, from `apps/mobile/src/state/support-store.ts`), `artist.id` (string).
- Produces: `getArtistSupportTotalKgs(history: SupportHistoryEntry[], artistId: string): number` — a pure function other screens (e.g. a future Analytics card) can reuse.

- [ ] **Step 1: Write the failing verify script**

Create `apps/mobile/scripts/verify-artist-support-total.mjs` with this exact content (the `#!/usr/bin/env node` shebang must be the file's literal first line):

```javascript
#!/usr/bin/env node
/**
 * Artist Dashboard Support stat card total (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md, Task 1). Usage:
 * npx tsx scripts/verify-artist-support-total.mjs
 */
import { getArtistSupportTotalKgs } from '../src/lib/artist-support-total.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const entry = (artistId, amount) => ({
  id: `sup-${artistId}-${amount}`,
  artistId,
  amount,
  currency: 'KGS',
  status: 'completed',
  createdAt: '2026-10-12T00:00:00+06:00',
});

check(
  'sums only the entries matching the given artist id',
  getArtistSupportTotalKgs([entry('me', 100), entry('solaris-echo', 9999), entry('me', 50)], 'me') === 150,
);
check('returns 0 for an artist with no entries', getArtistSupportTotalKgs([entry('solaris-echo', 100)], 'me') === 0);
check('returns 0 for an empty history array', getArtistSupportTotalKgs([], 'me') === 0);

if (failures > 0) {
  console.error(`\n${failures} artist-support-total check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-support-total checks passed.');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-artist-support-total.mjs`
Expected: FAIL — cannot resolve `../src/lib/artist-support-total.ts` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

```typescript
// apps/mobile/src/lib/artist-support-total.ts
import type { ArtistId, SupportHistoryEntry } from '@/mocks';

/**
 * Real sum of this artist's completed donations from Support History
 * (S-22) — not a mock stat. Used by the Artist Dashboard's Support card
 * instead of the previous hardcoded `formatKgsAmount(0)`.
 */
export function getArtistSupportTotalKgs(history: SupportHistoryEntry[], artistId: ArtistId): number {
  return history.filter((entry) => entry.artistId === artistId).reduce((sum, entry) => sum + entry.amount, 0);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-artist-support-total.mjs`
Expected: PASS — all 3 checks print `✓ OK`, script exits 0.

- [ ] **Step 5: Wire it into the dashboard screen**

In `apps/mobile/src/app/profile/artist/dashboard/index.tsx`, add the import (near the existing `formatKgsAmount` import at line 9):

```typescript
import { getArtistSupportTotalKgs } from '@/lib/artist-support-total';
import { useSupportStore } from '@/state/support-store';
```

Add inside the component, alongside the existing `const entries = useArtistStore((s) => s.entries);` at line 45:

```typescript
  const supportHistory = useSupportStore((s) => s.history);
```

Replace line 109:

```typescript
          <StatCard label={t('supportLabel')} value={`${formatKgsAmount(0)} сом`} icon="volunteer-activism" iconColor={Colors.secondary} />
```

with:

```typescript
          <StatCard
            label={t('supportLabel')}
            value={`${formatKgsAmount(getArtistSupportTotalKgs(supportHistory, artist.id))} сом`}
            icon="volunteer-activism"
            iconColor={Colors.secondary}
          />
```

- [ ] **Step 6: Register the new verify script, then run typecheck and the full test chain**

In `apps/mobile/package.json`, add after the existing `"verify:dashboard-routes"` entry:

```json
    "verify:artist-support-total": "tsx scripts/verify-artist-support-total.mjs",
```

Append ` && tsx scripts/verify-artist-support-total.mjs` to the end of the `"test"` script's `&&`-chain.

Run: `cd apps/mobile && pnpm run typecheck && pnpm test`
Expected: no new type errors, every existing verify script still passes, the new one passes as part of the chain.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/lib/artist-support-total.ts apps/mobile/scripts/verify-artist-support-total.mjs apps/mobile/src/app/profile/artist/dashboard/index.tsx apps/mobile/package.json
git commit -m "fix: wire Artist Dashboard Support card to real donation history"
```

## Task 2: Add a clearly-labeled demo-seed action and dev-only trigger screen

**Files:**
- Modify: `apps/mobile/src/state/artist-store.ts`
- Modify: `apps/mobile/src/app/profile/artist/dashboard/index.tsx`
- Create: `apps/mobile/src/app/dev-demo-seed.tsx`
- Create: `apps/mobile/scripts/verify-artist-store-demo-seed.mjs` (new — see Global Constraints: no Jest/Vitest)
- Modify: `apps/mobile/package.json` (register the new verify script)

**Interfaces:**
- Consumes: `useArtistStore`'s existing `artist`/`set`/`get` (unchanged signatures).
- Produces: `useArtistStore.seedDemoStats(listeners: number, streams: number): void` and a new session-local field, `demoStreams?: number`, read by the dashboard's Streams card. Stored on the Zustand state, not on the shared `Artist` mock type, since it is demo-only data other screens should not see.

- [ ] **Step 1: Write the failing verify script**

Create `apps/mobile/scripts/verify-artist-store-demo-seed.mjs` with this exact content (the `#!/usr/bin/env node` shebang must be the file's literal first line):

```javascript
#!/usr/bin/env node
/**
 * Dev-only demo-stat seeding on the Artist store (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md, Task 2). Exercises the real
 * store module directly via tsx, same approach as
 * scripts/verify-artist-store.mjs. Usage:
 * npx tsx scripts/verify-artist-store-demo-seed.mjs
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

// --- No-op before a profile exists ---------------------------------------
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('seedDemoStats() is a no-op when no artist profile exists yet (artist stays undefined)', useArtistStore.getState().artist === undefined);
check('seedDemoStats() is a no-op when no artist profile exists yet (demoStreams stays undefined)', useArtistStore.getState().demoStreams === undefined);

// --- Sets values once a profile exists ------------------------------------
useArtistStore.getState().createArtistProfile({ stageName: 'Demo Artist' });
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('seedDemoStats() sets monthlyListeners on the current artist', useArtistStore.getState().artist?.monthlyListeners === 12_000);
check('seedDemoStats() sets demoStreams on state', useArtistStore.getState().demoStreams === 45_000);

// --- Idempotent on a second call (absolute, not incrementing) -------------
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('calling seedDemoStats() twice sets an absolute value, not an increment', useArtistStore.getState().demoStreams === 45_000);

if (failures > 0) {
  console.error(`\n${failures} artist-store-demo-seed check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-store-demo-seed checks passed.');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/mobile && npx tsx scripts/verify-artist-store-demo-seed.mjs`
Expected: FAIL — `useArtistStore.getState().seedDemoStats is not a function`.

- [ ] **Step 3: Add the action to `artist-store.ts`**

Add `demoStreams?: number;` and `seedDemoStats: (listeners: number, streams: number) => void;` to the `ArtistState` type (after `entries: ArtistTrackEntry[];` at line 60):

```typescript
type ArtistState = {
  artist?: Artist;
  entries: ArtistTrackEntry[];
  /** DEMO SEED ONLY — not real analytics. Set by the dev-only demo-seed
   * screen (apps/mobile/src/app/dev-demo-seed.tsx) for the private
   * management demo. Absent in a normal session. */
  demoStreams?: number;

  createArtistProfile: (input: ArtistSetupInput) => Artist;
  saveDraft: (input: UploadTrackInput) => ArtistTrackEntry;
  publishTrack: (trackId: TrackId) => Promise<void>;
  simulateError: (trackId: TrackId) => void;
  retryPublish: (trackId: TrackId) => Promise<void>;
  /** DEMO SEED ONLY — sets realistic-looking, clearly non-real numbers on
   * the current local artist for demo purposes. No-op if no artist profile
   * exists yet. Does not touch any catalog artist other than `'me'`. */
  seedDemoStats: (listeners: number, streams: number) => void;
};
```

Add the implementation inside `create<ArtistState>((set, get) => ({ ... }))`, after `retryPublish` (after line 144):

```typescript
  seedDemoStats: (listeners, streams) => {
    const artist = get().artist;
    if (!artist) return;
    const updatedArtist: Artist = { ...artist, monthlyListeners: listeners };
    addMockArtist(updatedArtist);
    set({ artist: updatedArtist, demoStreams: streams });
  },
```

Also add the initial state field `demoStreams: undefined,` next to the existing `entries: [],` at line 71.

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/mobile && npx tsx scripts/verify-artist-store-demo-seed.mjs`
Expected: PASS — all 5 checks print `✓ OK`, script exits 0.

- [ ] **Step 5: Read `demoStreams` in the Streams stat card**

In `apps/mobile/src/app/profile/artist/dashboard/index.tsx`, add alongside the existing `const entries = useArtistStore((s) => s.entries);` at line 45:

```typescript
  const demoStreams = useArtistStore((s) => s.demoStreams);
```

Replace line 108:

```typescript
          <StatCard label={t('streams')} value="0" icon="play-circle-outline" iconColor={Colors.tertiary} />
```

with:

```typescript
          <StatCard label={t('streams')} value={String(demoStreams ?? 0)} icon="play-circle-outline" iconColor={Colors.tertiary} />
```

- [ ] **Step 6: Create the dev-only trigger screen**

```typescript
// apps/mobile/src/app/dev-demo-seed.tsx
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PillButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useArtistStore } from '@/state/artist-store';

import NotFoundScreen from './+not-found';

/**
 * DEV-ONLY demo-stat seeding button (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md). Not linked from any real
 * navigation. Sets clearly-labeled, non-real numbers on the current local
 * artist for the private management demo — never on any other artist.
 * Stripped from production and from the web export, same as dev-ui-kit.tsx.
 */
export default function DevDemoSeedScreen() {
  return __DEV__ ? <DevDemoSeedPanel /> : <NotFoundScreen />;
}

function DevDemoSeedPanel() {
  const artist = useArtistStore((s) => s.artist);
  const seedDemoStats = useArtistStore((s) => s.seedDemoStats);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <SafeAreaView style={styles.content}>
        <ThemedText variant="headline-md">Demo stat seed (dev only)</ThemedText>
        <ThemedText variant="body-md">
          {artist ? `Current artist: ${artist.name}` : 'No artist profile yet — complete Become an Artist first.'}
        </ThemedText>
        <PillButton
          label="Seed 12,400 listeners / 58,900 streams"
          onPress={() => seedDemoStats(12_400, 58_900)}
          disabled={!artist}
        />
        <PillButton label="Back to Dashboard" onPress={() => router.push('/profile/artist/dashboard')} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, gap: Spacing.md, padding: Spacing.margin },
});
```

- [ ] **Step 7: Register the new verify script, then run typecheck and the full test chain**

In `apps/mobile/package.json`, add after the `"verify:artist-support-total"` entry added in Task 1:

```json
    "verify:artist-store-demo-seed": "tsx scripts/verify-artist-store-demo-seed.mjs",
```

Append ` && tsx scripts/verify-artist-store-demo-seed.mjs` to the end of the `"test"` script's `&&`-chain.

Run: `cd apps/mobile && pnpm run typecheck && pnpm test`
Expected: no new type errors, every existing verify script (including `verify-artist-store.mjs`, which exercises the same store module) still passes, both new scripts pass as part of the chain.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/state/artist-store.ts apps/mobile/scripts/verify-artist-store-demo-seed.mjs apps/mobile/src/app/profile/artist/dashboard/index.tsx apps/mobile/src/app/dev-demo-seed.tsx apps/mobile/package.json
git commit -m "feat: add dev-only demo-stat seeding for Artist Dashboard demo"
```

## Task 3: Documented walkthrough to populate the dashboard via the real flow (no code)

**Files:** none — this is an operator script run against a live `expo start --web` session, after Tasks 1 and 2 are merged.

- [ ] **Step 1:** Start the dev server: `cd apps/mobile && npx expo start --web`.
- [ ] **Step 2:** Navigate to Profile → Become an Artist. Fill in a stage name (e.g. "Nomad Collective"), pick a genre, add a short bio and location. Submit.
- [ ] **Step 3:** From the resulting empty Dashboard, tap Upload Track. Create 3 tracks with real-sounding titles (e.g. "Steppe Horizon", "Night Train to Osh", "Quiet Water"). For each: submit the upload form, then wait at least 2 seconds (covers the 600ms + 900ms simulated upload/transcode delay in `publishTrack`) before checking its status — it should read "Published", not "Uploading"/"Transcoding". If a track is still mid-transition, wait longer before proceeding; do not screenshot or demo a track mid-status.
- [ ] **Step 4:** Navigate to Profile → Support, select this same artist (via its public profile route), complete a donation of any of the existing quick amounts (10/50/100/500 сом). This appends a real `SupportHistoryEntry` for this artist, which Task 1's fix now sums correctly on the dashboard.
- [ ] **Step 5:** Navigate to `/dev-demo-seed` directly (type the URL in the web dev server, or add a temporary link — it is intentionally not in normal navigation) and tap the seed button to set listeners/streams.
- [ ] **Step 6:** Return to the Dashboard (`/profile/artist/dashboard`). Confirm: Overview shows non-zero Listeners, Streams, and Support; 3 published releases are listed; Analytics/Promotion/Studio Pro tabs render without errors for this artist. This state is now ready for Task 3 of the screenshot plan.
