# Global Navigation, Track List Cleanup & Glassmorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Home/Search/Library nav persistently reachable on every screen, remove heart/duration visual noise from shared track rows (while keeping like functionality reachable), fix the playlist header showing a stale track count next to an empty-state message, and give the nav pill a glass treatment — without touching the frozen visual design anywhere else.

**Architecture:** `FloatingTabBar` (the pill rendered inside the `(tabs)` navigator) gets split into a presentational `TabPill` (icons, sliding focus indicator, sink animation, glass surface) and the existing Tabs-coupled adapter. A new `RootNavBar` renders the same `TabPill` on the three root-level screens that currently lose all navigation (`artist/[id]`, `album/[id]`, `playlist/[id]` — confirmed via `src/app/_layout.tsx`: these are `Stack.Screen` siblings of `(tabs)`, not nested inside it, so `FloatingTabBar`/`MiniPlayer`, mounted only in `(tabs)/_layout.tsx`, are unmounted entirely there). This mirrors the precedent those three screens already established for the mini-player itself (`MiniPlayerOverlay`, exported from `src/components/mini-player.tsx`, already renders the player capsule outside the Tabs context) — `RootNavBar` is the same idea applied to the pill, and `MiniPlayerOverlay` is repositioned to sit above it exactly as `MiniPlayer` already sits above `FloatingTabBar` inside the Tabs layout. The shared `TrackRow` (`src/components/ui/list-row.tsx`) drops its inline heart button and duration label; the one per-track Like/Unlike action moves into the existing track options sheet (`src/app/sheets/options.tsx`), which does not yet have one. The playlist header's `trackList.length || playlist.trackCount` falls back to stale static metadata whenever `trackList.length` is `0` (falsy in JS) — fixed to use the real resolved count unconditionally.

**Tech Stack:** Expo Router (static web export + native), React Native, Zustand (`usePlayerStore`), `react-native-reanimated`, `expo-blur`.

**Spec:** No separate spec document — the user's own request message ("Mmusic — Global Navigation, Track List Cleanup & Glassmorphism") is the spec. Its exact text is reproduced in Global Constraints below.

## Global Constraints

- The current visual design is approved and frozen. This is a targeted correction task, NOT a redesign.
- Task 1 (nav): reuse the existing nav component — do not create multiple navigation bars or change the approved navigation structure unnecessarily. Mini-player stays directly above the bottom nav. Must not overlap content, must respect safe areas and scrollable content, must preserve back navigation and the mini-player's own gestures.
- Task 2 (track rows): remove heart icon and duration label from track rows globally. Keep artwork, title, artist name, explicit badge, three-dot menu, existing playback interactions. Do not remove liking functionality — it must stay reachable through an existing contextual menu or other approved control. Do not remove the heart from the mini-player. Preserve existing typography/artwork dimensions/spacing/colors.
- Task 3 (playlist data bug): never show a populated count next to an empty track list without an explicitly-explained data problem. Do not invent/fabricate tracks. Do not overwrite user-created playlist data.
- Task 4 (glass nav): frosted translucent glass — background blur, subtle light border, soft restrained highlights, slight transparency, rounded capsule, existing red/coral active accent, clear icon/label contrast. No excessive glow. No heavy gradients. No new floating decorative elements. Preserve approved layout/icons/dimensions as much as possible. Support Safari and Chrome with a graceful `backdrop-filter` fallback.
- Do NOT modify: approved Home editorial layout; Late Night Flow animations; Dynamic Premium Player; player gestures (horizontal/vertical); Lyrics and Queue; Particle Wave; existing approved transitions; Artist Dashboard; backend/API; any screen or component not named in this plan.
- Do not commit, push, merge, reset, clean, or deploy anything. Everything stays local and uncommitted until the user gives explicit visual approval.

## Review Focus

- Toggling Like from the new options-sheet row must repaint every other already-open view of that same track (Home "Jump back in", Liked Songs, Search results) without a reload, since they all read the same `usePlayerStore().likedTrackIds` set — a stale row anywhere means the toggle only updated local state instead of the shared store.
- "Late Night Flow" (the one playlist with a real, non-empty `trackIds` array) must still show "5 tracks • 19 min" unchanged after the Task 3 fix — a regression here would mean the fix broke the populated case while fixing the empty one.
- `RootNavBar` renders the same three items as `FloatingTabBar` with all three `focused: false` (no tab is "current" on a cross-tab screen) — confirm the sliding focus indicator never flashes/renders at index `-1` and nothing throws when `layouts.current[-1]` is read.
- The web `backdrop-filter` fallback must not be verified only in the Chromium-based browser-automation tool — note in the final report that Safari-engine rendering could not be directly automated, so the user should spot-check Safari (or the deployed preview on an iPhone) before treating Task 4's cross-browser claim as fully proven.
- After `MiniPlayerOverlay` is repositioned above `RootNavBar`, confirm the mini-player's own horizontal swipe-to-skip gesture on Artist/Album/Playlist still has its full hit area and isn't newly clipped or obstructed by the pill now sitting directly beneath it.

---

### Task 1: Extract the shared `TabPill` from `FloatingTabBar`

Pure refactor — same visuals, same behavior inside `(tabs)`, no new screens wired up yet. This is the foundation `RootNavBar` (Task 3) builds on.

**Files:**
- Modify: `apps/mobile/src/components/nav/floating-tab-bar.tsx`

**Interfaces:**
- Produces: `export type TabPillItem = { key: string; label: string; icon: (props: { color: string; size: number }) => ReactNode; focused: boolean; onPress: () => void }` and `export function TabPill({ items }: { items: TabPillItem[] })` — both consumed by Task 3's `RootNavBar`.
- Produces (unchanged, re-exported as before): `PILL_HEIGHT`, `PILL_BOTTOM_GAP`, `CAPSULE_GAP` — consumed by `(tabs)/_layout.tsx` (unchanged caller) and by Task 3's `mini-player.tsx` changes.
- Consumes: nothing new.

- [ ] **Step 1: Replace the file with the extracted version**

Replace the full contents of `apps/mobile/src/components/nav/floating-tab-bar.tsx` with:

```tsx
import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { pillSinkOffset } from '@/lib/stage-rules';
import { expandOrigin, expandProgress } from '@/state/player-surface';

/** The props expo-router's Tabs passes to a custom tab bar (no direct
 * @react-navigation import: it is not a direct dependency). */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const PILL_HEIGHT = 56;
export const PILL_BOTTOM_GAP = Spacing.sm;
/** Space between the pill and the capsule floating above it. */
export const CAPSULE_GAP = Spacing.sm;
const TAB_ICON_SIZE = 22;

/** One destination on the floating pill. `FloatingTabBar` (inside the Tabs
 * navigator) and `RootNavBar` (on Artist/Album/Playlist, outside it) each
 * build this shape from their own source of truth, so both render the same
 * `TabPill` instead of two separate nav bars. */
export type TabPillItem = {
  key: string;
  label: string;
  icon: (props: { color: string; size: number }) => ReactNode;
  focused: boolean;
  onPress: () => void;
};

/**
 * Floating navigation pill — Home / Search / Library (W3 Этап 1, Concept D,
 * iphone/home.png): a solid surface with a hairline border floating above the
 * content, no glass or blur. The sliding focus indicator, per-icon scale, and
 * the sink-under-the-Home-stage animation all live here so every renderer of
 * the pill shares one implementation.
 */
export function TabPill({ items }: { items: TabPillItem[] }) {
  const insets = useSafeAreaInsets();
  // While the Home stage grows into Now Playing, the pill sinks below the edge.
  const reduceMotion = useReducedMotion();
  const sinkDistance = PILL_HEIGHT + PILL_BOTTOM_GAP + insets.bottom + 16;
  const sinkStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillSinkOffset(expandProgress.value, expandOrigin.value, reduceMotion, sinkDistance) }],
  }));

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const layouts = useRef<Record<number, { x: number; width: number }>>({});
  const [ready, setReady] = useState(false);
  const focusedIndex = items.findIndex((item) => item.focused);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
    opacity: ready ? 1 : 0,
  }));

  const measure = (index: number, x: number, width: number) => {
    layouts.current[index] = { x, width };
    if (index === focusedIndex) {
      indicatorX.value = x;
      indicatorW.value = width;
      setReady(true);
    }
  };

  useEffect(() => {
    const box = layouts.current[focusedIndex];
    if (!box) return;
    if (reduceMotion) {
      indicatorX.value = box.x;
      indicatorW.value = box.width;
    } else {
      indicatorX.value = withTiming(box.x, { duration: 220 });
      indicatorW.value = withTiming(box.width, { duration: 220 });
    }
  }, [focusedIndex, reduceMotion, indicatorX, indicatorW]);

  return (
    <View pointerEvents="box-none" style={[styles.slot, { bottom: insets.bottom + PILL_BOTTOM_GAP }]}>
      <Animated.View style={[styles.pill, sinkStyle]} accessibilityRole="tablist">
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
        {items.map((item, index) => (
          <PressableScale
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.focused }}
            accessibilityLabel={item.label}
            onPress={item.onPress}
            onLayout={(e) => measure(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
            style={styles.item}
            testID={`tab-${item.key}`}
          >
            <TabIcon focused={item.focused} reduceMotion={reduceMotion}>
              {item.icon({ color: item.focused ? Colors.primary : Colors.text.medium, size: TAB_ICON_SIZE })}
            </TabIcon>
            <ThemedText variant="label-sm" style={{ color: item.focused ? Colors.primary : Colors.text.medium }}>
              {item.label}
            </ThemedText>
          </PressableScale>
        ))}
      </Animated.View>
    </View>
  );
}

/** Tabs' own tab bar — builds the shared `TabPill` from the Tabs
 * navigator's state; the tabs, their stacks and the tabPress behaviour
 * (re-tap pops to the stack's root) are unchanged. */
export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const items: TabPillItem[] = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label = typeof options.title === 'string' ? options.title : route.name;
    return {
      key: route.key,
      label,
      focused,
      icon: ({ color, size }) => options.tabBarIcon?.({ focused, color, size }),
      onPress: () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      },
    };
  });
  return <TabPill items={items} />;
}

function TabIcon({ focused, reduceMotion, children }: { focused: boolean; reduceMotion: boolean; children: ReactNode }) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  useEffect(() => {
    scale.value = reduceMotion ? (focused ? 1 : 0.92) : withTiming(focused ? 1 : 0.92, { duration: 180 });
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: 0.75 + scale.value * 0.25 }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
  },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    minWidth: 76,
    height: PILL_HEIGHT - 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radii.full,
  },
});
```

This is the exact previous rendering logic, just reshaped around `TabPillItem[]` instead of reading `state`/`descriptors` directly inside the render loop — the pixels and motion are unchanged.

- [ ] **Step 2: Verify nothing else imports the removed internal shape**

Run: `grep -rn "FloatingTabBar\|floating-tab-bar" apps/mobile/src --include=*.tsx --include=*.ts`
Expected: only `apps/mobile/src/app/(tabs)/_layout.tsx` (imports `FloatingTabBar`, `PILL_HEIGHT`, `PILL_BOTTOM_GAP`, `CAPSULE_GAP` — all still exported) and `floating-tab-bar.tsx` itself. No other file references anything removed.

- [ ] **Step 3: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors.

Run: `npx expo lint`
Expected: no new errors.

Run: `npm test`
Expected: full suite passes, same as before this change.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/nav/floating-tab-bar.tsx
git commit -m "refactor: extract TabPill from FloatingTabBar"
```

---

### Task 2: Glassmorphism pill (Task 4 of the request)

**Files:**
- Modify: `apps/mobile/src/components/nav/floating-tab-bar.tsx`

**Interfaces:**
- Consumes: `Blur.card` from `@mmusic/design-tokens` (re-exported as `Blur` in `@/constants/theme`, confirmed at `packages/design-tokens/src/effects.ts:6` — `blur.card = 24`), `BlurView` from `expo-blur` (already a dependency, already used with the `intensity`/`tint="dark"` pattern in `apps/mobile/src/components/ui/toast.tsx`).
- Produces: no new exports — only the `pill`/`pillBlur` styles and the `BlurView` layer change, behind the same `TabPill` component Task 1 produced.

- [ ] **Step 1: Add the blur import and the `Blur` token**

In `apps/mobile/src/components/nav/floating-tab-bar.tsx`, change:

```tsx
import { Colors, Radii, Spacing } from '@/constants/theme';
```
to:
```tsx
import { BlurView } from 'expo-blur';

import { Blur, Colors, Radii, Spacing } from '@/constants/theme';
```

- [ ] **Step 2: Render the blur layer behind the pill's content**

In `TabPill`'s return, change:
```tsx
      <Animated.View style={[styles.pill, sinkStyle]} accessibilityRole="tablist">
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
```
to:
```tsx
      <Animated.View style={[styles.pill, sinkStyle]} accessibilityRole="tablist">
        <BlurView intensity={Blur.card} tint="dark" style={styles.pillBlur} />
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
```

- [ ] **Step 3: Make the pill translucent and add the blur style**

Change the `pill` style and add `pillBlur`:
```tsx
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(20, 20, 24, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  pillBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.full,
  },
```
(`overflow: 'hidden'` is required so the blur layer is clipped to the pill's rounded corners instead of showing square corners behind it. `borderTopColor` brighter than the rest of the border is the "soft restrained highlight" — a single extra highlight, not a gradient or glow.)

Rationale for the specific values: `rgba(20, 20, 24, 0.55)` keeps the same hue family as the old opaque `#141418` at ~55% opacity so icon/label contrast (white/coral text, `Colors.text.medium` secondary) stays readable per the "clear icon/label contrast" requirement; `shadowOpacity` is nudged down from `0.4` to `0.32` only because the surface itself is no longer fully opaque — the drop shadow and blur would otherwise visually double up. No other value changes.

- [ ] **Step 4: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

Run: `npm run build:web`
Expected: build succeeds.

- [ ] **Step 5: Visual check**

Serve the web build locally and screenshot the pill on Home at both a ~390px mobile viewport and desktop width. Confirm: translucent background with visible blur behind it, a visible top highlight on the border, the coral active-tab indicator still shows clearly, no glow/gradient was added, pill size/position unchanged from before.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/nav/floating-tab-bar.tsx
git commit -m "feat: glassmorphism treatment for the floating nav pill"
```

---

### Task 3: Persistent nav on Artist/Album/Playlist (Task 1 of the request)

**Files:**
- Create: `apps/mobile/src/components/nav/root-nav-bar.tsx`
- Modify: `apps/mobile/src/components/mini-player.tsx` (reposition `MiniPlayerOverlay`, bump `MINI_PLAYER_OVERLAY_CLEARANCE`)
- Modify: `apps/mobile/src/app/artist/[id].tsx`, `apps/mobile/src/app/album/[id].tsx`, `apps/mobile/src/app/playlist/[id].tsx` (render `<RootNavBar />`)

**Interfaces:**
- Consumes: `TabPill`, `TabPillItem` from Task 1's `floating-tab-bar.tsx`; `t('homeTab')`/`t('searchTab')`/`t('libraryTab')` from `useAppStrings()` (already defined, already used by `(tabs)/_layout.tsx`); `Icon` from `@/components/ui/icon` (props confirmed: `name`, `size`, `color`).
- Produces: `export function RootNavBar()` — consumed by the three screen files below.

- [ ] **Step 1: Create `RootNavBar`**

Create `apps/mobile/src/components/nav/root-nav-bar.tsx`:

```tsx
import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { useAppStrings } from '@/state/locale-store';

import { TabPill, type TabPillItem } from './floating-tab-bar';

/**
 * The same Home/Search/Library pill as `FloatingTabBar`, for the cross-tab
 * screens that live outside the Tabs navigator (Artist, Album, Playlist —
 * siblings of `(tabs)` in `src/app/_layout.tsx`, so `FloatingTabBar` is
 * unmounted there). None of the three is ever shown focused here: these
 * screens aren't "on" a tab, so tapping one just takes the listener there —
 * mirroring how `MiniPlayerOverlay` already reuses the player capsule on
 * these same three screens.
 */
export function RootNavBar() {
  const { t } = useAppStrings();
  const items: TabPillItem[] = [
    {
      key: 'home',
      label: t('homeTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
      onPress: () => router.push('/home'),
    },
    {
      key: 'search',
      label: t('searchTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="search" color={color} size={size} />,
      onPress: () => router.push('/search'),
    },
    {
      key: 'library',
      label: t('libraryTab'),
      focused: false,
      icon: ({ color, size }) => <Icon name="library-music" color={color} size={size} />,
      onPress: () => router.push('/library'),
    },
  ];
  return <TabPill items={items} />;
}
```

- [ ] **Step 2: Reposition `MiniPlayerOverlay` above the pill and bump its clearance**

In `apps/mobile/src/components/mini-player.tsx`, add a new import line for the floating-tab-bar constants:

```tsx
import { CAPSULE_GAP, PILL_BOTTOM_GAP, PILL_HEIGHT } from '@/components/nav/floating-tab-bar';
```

Change the `MiniPlayerOverlay` function (currently at line 345) from:
```tsx
/**
 * The same mini-player for full screens outside the tab navigator (Artist,
 * Album, Playlist — Stitch shows it there too), pinned above the bottom safe
 * area instead of above the tab bar. Pair with `MINI_PLAYER_OVERLAY_CLEARANCE`
 * bottom padding on the screen's scroll content.
 */
export function MiniPlayerOverlay() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlaySlot, { bottom: insets.bottom + Spacing.sm }]} pointerEvents="box-none">
      <MiniPlayer />
    </View>
  );
}
```
to:
```tsx
/**
 * The same mini-player for full screens outside the tab navigator (Artist,
 * Album, Playlist — Stitch shows it there too), pinned above `RootNavBar`
 * exactly as `MiniPlayer` sits above `FloatingTabBar` inside the Tabs
 * layout. Pair with `MINI_PLAYER_OVERLAY_CLEARANCE` bottom padding on the
 * screen's scroll content.
 */
export function MiniPlayerOverlay() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.overlaySlot, { bottom: insets.bottom + PILL_BOTTOM_GAP + PILL_HEIGHT + CAPSULE_GAP }]}
      pointerEvents="box-none"
    >
      <MiniPlayer />
    </View>
  );
}
```

Change the clearance constant (currently at line 363) from:
```tsx
/** Scroll padding that keeps content clear of `MiniPlayerOverlay`. */
export const MINI_PLAYER_OVERLAY_CLEARANCE = 96;
```
to:
```tsx
/** Scroll padding that keeps content clear of `MiniPlayerOverlay` — the
 * original 96px mini-player clearance plus the pill (`RootNavBar`) now
 * sitting beneath it. */
export const MINI_PLAYER_OVERLAY_CLEARANCE = 96 + PILL_HEIGHT + CAPSULE_GAP;
```

- [ ] **Step 3: Render `RootNavBar` on the three screens**

In `apps/mobile/src/app/artist/[id].tsx`: change the import line
```tsx
import { MINI_PLAYER_OVERLAY_CLEARANCE, MiniPlayerOverlay } from '@/components/mini-player';
```
to also import `RootNavBar`:
```tsx
import { MINI_PLAYER_OVERLAY_CLEARANCE, MiniPlayerOverlay } from '@/components/mini-player';
import { RootNavBar } from '@/components/nav/root-nav-bar';
```
and change the closing of the returned JSX from:
```tsx
      </ScrollView>
      <MiniPlayerOverlay />
    </ThemedView>
```
to:
```tsx
      </ScrollView>
      <RootNavBar />
      <MiniPlayerOverlay />
    </ThemedView>
```

Apply the identical two edits (import + the `<RootNavBar />` line immediately before `<MiniPlayerOverlay />`) to `apps/mobile/src/app/album/[id].tsx` and `apps/mobile/src/app/playlist/[id].tsx`. In `album/[id].tsx` the closing block is:
```tsx
      </ScrollView>
      {toast}
      <MiniPlayerOverlay />
    </ThemedView>
```
— insert `<RootNavBar />` right before `<MiniPlayerOverlay />` there too, after `{toast}`. Same in `playlist/[id].tsx`, whose closing block is identical in shape.

- [ ] **Step 4: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

Run: `npm run build:web`
Expected: build succeeds.

- [ ] **Step 5: Visual + behavioral check**

Serve the web build locally. For each of Artist, Album, and a populated Playlist (e.g. "Late Night Flow"):
- Confirm the Home/Search/Library pill is visible and none of its three items shows the active-coral state.
- Tap each of Home/Search/Library and confirm it navigates to that tab's root.
- Start playback, confirm the mini-player capsule renders above the pill (not overlapping it, not overlapped by it).
- Scroll the screen's content to the bottom and confirm the last row is not hidden behind either the mini-player or the pill.
- Swipe the mini-player horizontally and confirm the skip-track gesture still works unobstructed.
- Repeat at a ~390px mobile viewport and at desktop width.

Also re-check Home/Search/Library themselves (inside the Tabs navigator): confirm the pill and mini-player still render exactly as before (Task 1 was a pure refactor, but this step confirms the clearance bump didn't change their unrelated `Spacing.miniPlayerClearance` padding).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/nav/root-nav-bar.tsx apps/mobile/src/components/mini-player.tsx apps/mobile/src/app/artist/\[id\].tsx apps/mobile/src/app/album/\[id\].tsx apps/mobile/src/app/playlist/\[id\].tsx
git commit -m "fix: persistent bottom nav on Artist, Album, and Playlist screens"
```

---

### Task 4: Fix the playlist header's stale track count (Task 3 of the request)

**Root cause (for the report):** `apps/mobile/src/mocks/playlists.ts` defines 5 editorial playlists. Only `late-night-flow` has an authored `trackIds` array; `late-night-driving`, `lofi-beats-to-code`, `electronic-essentials`, and `this-is-solaris-echo` were only ever given placeholder `trackCount`/`durationLabel` metadata from an early content-planning pass — nobody filled in their actual track lists. `apps/mobile/src/app/playlist/[id].tsx` resolves the real list as `(playlist?.trackIds ?? []).map(getTrackById).filter(Boolean)`, so for those four playlists `trackList.length` is genuinely `0`. The header then renders `formatTrackCount(trackList.length || playlist.trackCount)` — since `0` is falsy in JS, `||` silently falls back to the stale static `playlist.trackCount` (48 for Late Night Driving) instead of showing the real `0`, while the empty-state block directly below correctly checks `trackList.length === 0` with no such fallback. That mismatch — not a broken track-ID lookup, and not unique to Late Night Driving — is the entire bug, and it affects all four playlists that lack `trackIds`.

**Fix:** stop the header from ever reporting anything other than the real resolved count. No track IDs are fabricated, no playlist's stored data is touched.

**Files:**
- Modify: `apps/mobile/src/app/playlist/[id].tsx`
- Create: `apps/mobile/scripts/verify-playlist-track-count.mjs`
- Modify: `apps/mobile/package.json` (register the new script in the `test` chain)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — behavior-only fix inside the existing render.

**Important — there is no Jest in this project.** `npm test` (see `apps/mobile/package.json`'s `"test"` script) runs a fixed chain of standalone `node`/`tsx` scripts under `apps/mobile/scripts/verify-*.mjs`, each importing straight from the `.ts` mock/source files and using a local `check(label, condition)` helper that `console.error`s and increments a `failures` counter, ending with `process.exit(1)` if any failed. There is no `describe`/`it`/`expect` global anywhere in this codebase — do not write Jest-style tests. Follow the exact shape of `apps/mobile/scripts/verify-album-tracks.mjs` (read it first for the convention).

- [ ] **Step 1: Write the verify script**

Create `apps/mobile/scripts/verify-playlist-track-count.mjs`:
```js
#!/usr/bin/env node
/**
 * Playlist header track count must never show a stale, non-zero count next
 * to an empty track list (the "Late Night Driving" bug — docs/superpowers/
 * plans/2026-10-12-nav-tracklist-glass-fixes.md Task 4). Usage: npx tsx
 * scripts/verify-playlist-track-count.mjs
 */
import { getTrackById, playlists } from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

function resolvedTrackCount(playlist) {
  return (playlist.trackIds ?? []).map((id) => getTrackById(id)).filter(Boolean).length;
}

for (const playlist of playlists) {
  const resolvedCount = resolvedTrackCount(playlist);
  if (resolvedCount === 0) {
    // Pins the exact bug this task fixes: the header must never fall back
    // to the stale static `trackCount` metadata once the real list is empty.
    check(`"${playlist.title}" has a genuinely empty resolved track list (0)`, resolvedCount === 0);
    check(`"${playlist.title}"'s stale metadata trackCount (${playlist.trackCount}) is nonzero — confirms this is the stale-fallback case, not a data-entry zero`, playlist.trackCount !== 0);
  }
}

const flow = playlists.find((p) => p.id === 'late-night-flow');
check('the "Late Night Flow" playlist exists', !!flow);
if (flow) {
  check('"Late Night Flow" still resolves its real 5 tracks (the populated case must stay unaffected by this fix)', resolvedTrackCount(flow) === 5);
}

if (failures > 0) {
  console.error(`\n${failures} playlist-track-count check(s) failed.`);
  process.exit(1);
}
console.log('\nAll playlist-track-count checks passed.');
```

- [ ] **Step 2: Register it in the test chain and run it**

In `apps/mobile/package.json`, append `&& tsx scripts/verify-playlist-track-count.mjs` to the end of the existing `"test"` script string (after `... && tsx scripts/verify-dashboard-routes.mjs`), matching how every other `verify-*.mjs` script is chained in.

Run: `cd apps/mobile && npx tsx scripts/verify-playlist-track-count.mjs`
Expected: all checks print `✓ OK`, exits 0. (This only pins today's mock-data shape — it is not yet exercising the buggy render line, which Step 3 fixes next. Nothing in this script touches `playlist/[id].tsx`'s render output directly, since that is a React component; this script guards the data-shape precondition the bug depends on and must keep holding after Step 3.)

- [ ] **Step 3: Fix the render line**

In `apps/mobile/src/app/playlist/[id].tsx`, change:
```tsx
          <ThemedText variant="body-sm" emphasis="medium">
            {formatTrackCount(trackList.length || playlist.trackCount)}
            {playlist.durationLabel ? ` • ${playlist.durationLabel}` : ''}
          </ThemedText>
```
to:
```tsx
          <ThemedText variant="body-sm" emphasis="medium">
            {formatTrackCount(trackList.length)}
            {trackList.length > 0 && playlist.durationLabel ? ` • ${playlist.durationLabel}` : ''}
          </ThemedText>
```

- [ ] **Step 4: Verify manually against both cases**

Serve the web build locally and open:
- `/playlist/late-night-driving` — Expected: header reads "0 tracks" with no duration, directly above the existing "No tracks yet — add some from any track's ⋮ menu." message. No contradiction.
- `/playlist/late-night-flow` — Expected: header still reads "5 tracks • 19 min", tracks render normally. Unchanged from before this fix.

- [ ] **Step 5: Typecheck, lint, full test suite**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass, including the new `verify-playlist-track-count.mjs` check now chained into `npm test`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/playlist/\[id\].tsx apps/mobile/scripts/verify-playlist-track-count.mjs apps/mobile/package.json
git commit -m "fix: playlist header never shows a stale count beside an empty track list"
```

---

### Task 5: Remove heart/duration from `TrackRow`; move Like/Unlike into the track options sheet (Task 2 of the request)

**Files:**
- Modify: `apps/mobile/src/components/ui/list-row.tsx` (`TrackRow` only — `QueueRow`, `LibraryRow`, and the rest of the file are untouched; Queue is explicitly out of scope)
- Modify: `apps/mobile/src/app/sheets/options.tsx` (add the Like/Unlike action)
- Modify (drop now-removed props + now-dead selectors): `apps/mobile/src/app/playlist/[id].tsx`, `apps/mobile/src/app/album/[id].tsx`, `apps/mobile/src/app/artist/[id].tsx`, `apps/mobile/src/app/(tabs)/library/liked-songs.tsx`, `apps/mobile/src/app/(tabs)/library/index.tsx`, `apps/mobile/src/app/(tabs)/search/results.tsx`, `apps/mobile/src/app/dev-ui-kit.tsx`

**Interfaces:**
- Consumes: `usePlayerStore` (already imported in every file above and in `options.tsx`) — `likedTrackIds: Set<string>`, `toggleLike(trackId: string): void` (both already exist and are already used the same way elsewhere, e.g. in `mini-player.tsx`).
- Produces: `TrackRowProps` loses `durationLabel`, `liked`, `onToggleLike`. Any other code constructing a `TrackRowProps` value (there is none besides the JSX call sites below) would need updating; grep confirms the 9 call sites found are the only ones.

- [ ] **Step 1: Remove the heart and duration from `TrackRow`**

In `apps/mobile/src/components/ui/list-row.tsx`, change the `TrackRowProps` type from:
```tsx
export type TrackRowProps = {
  /** Track position in the list; replaced by an equalizer icon when `isPlaying`. */
  index?: number;
  coverUri?: LocalOrRemoteImage;
  title: string;
  artist: string;
  durationLabel?: string;
  explicit?: boolean;
  lossless?: boolean;
  isPlaying?: boolean;
  /** Current track (playing or paused): raised row + coral title, as every
   * Stitch track list highlights it. */
  active?: boolean;
  liked?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onToggleLike?: () => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
};
```
to:
```tsx
export type TrackRowProps = {
  /** Track position in the list; replaced by an equalizer icon when `isPlaying`. */
  index?: number;
  coverUri?: LocalOrRemoteImage;
  title: string;
  artist: string;
  explicit?: boolean;
  lossless?: boolean;
  isPlaying?: boolean;
  /** Current track (playing or paused): raised row + coral title, as every
   * Stitch track list highlights it. */
  active?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
};
```

Change the function signature from:
```tsx
export function TrackRow({
  index,
  coverUri,
  title,
  artist,
  durationLabel,
  explicit,
  lossless,
  isPlaying = false,
  active = false,
  liked = false,
  onPress,
  onToggleLike,
  onOptionsPress,
  style,
}: TrackRowProps) {
```
to:
```tsx
export function TrackRow({
  index,
  coverUri,
  title,
  artist,
  explicit,
  lossless,
  isPlaying = false,
  active = false,
  onPress,
  onOptionsPress,
  style,
}: TrackRowProps) {
```

Change the accessibility role line from:
```tsx
      accessibilityRole={onToggleLike || onOptionsPress ? undefined : 'button'}
```
to:
```tsx
      accessibilityRole={onOptionsPress ? undefined : 'button'}
```

Remove the heart `IconButton` block entirely:
```tsx
      {onToggleLike && (
        <IconButton
          icon={liked ? 'favorite' : 'favorite-border'}
          onPress={onToggleLike}
          color={liked ? Colors.primary : Colors.text.medium}
          size={36}
          style={styles.transparentIconButton}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        />
      )}
```

Remove the duration `ThemedText` block entirely:
```tsx
      {durationLabel && (
        <ThemedText variant="mono-num" emphasis="medium" style={styles.duration}>
          {durationLabel}
        </ThemedText>
      )}
```

Leave `QueueRow`, `LibraryRow`, every other export, and the `styles` object (including `styles.duration`, still used by `QueueRow`) unchanged.

- [ ] **Step 2: Add Like/Unlike to the track options sheet**

In `apps/mobile/src/app/sheets/options.tsx`, add two selectors alongside the existing `usePlayerStore` ones:
```tsx
  const playMix = usePlayerStore((s) => s.play);
  const shuffleMix = usePlayerStore((s) => s.playShuffled);
```
becomes:
```tsx
  const playMix = usePlayerStore((s) => s.play);
  const shuffleMix = usePlayerStore((s) => s.playShuffled);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
```

Then, in the `kind === 'track' && track && (<>...</>)` block, add a Like/Unlike row as the first item:
```tsx
        {kind === 'track' && track && (
          <>
            <MenuRow
              variant="flat"
              icon={likedTrackIds.has(track.id) ? 'favorite' : 'favorite-border'}
              title={likedTrackIds.has(track.id) ? 'Unlike' : 'Like'}
              onPress={() => toggleLike(track.id)}
            />
            <MenuRow
              variant="flat"
              icon="playlist-add"
              title="Add to playlist"
              onPress={() => router.replace({ pathname: '/sheets/add-to-playlist', params: { trackId: track.id } })}
            />
```
(the remaining rows — View artist, Go to album, Donate, Share track — are unchanged, just pushed one row down).

- [ ] **Step 3: Drop the removed props from every `TrackRow` call site**

In `apps/mobile/src/app/playlist/[id].tsx`: remove the comment and three selectors
```tsx
  // Subscribe to the liked set itself (not the stable `isLiked` function) so
  // the hearts re-render when a like is toggled.
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const isLiked = (trackId: string) => likedTrackIds.has(trackId);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
```
and remove `durationLabel={formatDuration(track.durationSec)}`, `liked={isLiked(track.id)}`, and `onToggleLike={() => toggleLike(track.id)}` from the `<TrackRow>` call. Remove the now-dead `formatDuration` helper function at the bottom of the file (its only call site is the line just removed).

Apply the same three removals (comment + 3 selectors; the 3 matching JSX props; the now-dead `formatDuration` helper) to `apps/mobile/src/app/album/[id].tsx` and `apps/mobile/src/app/artist/[id].tsx` — each has the identical shape (confirmed: in both files `likedTrackIds`/`isLiked`/`toggleLike` are used only at their one `TrackRow` call).

In `apps/mobile/src/app/(tabs)/library/liked-songs.tsx`: remove `durationLabel={formatDuration(track.durationSec)}`, `liked`, and `onToggleLike={() => toggleLike(track.id)}` from the `<TrackRow>` call. Remove the `toggleLike` selector line (`likedTrackIds` stays — it's used elsewhere in this file to build `likedTracks`/`likedTrackIdsOrdered`). Remove `formatDuration` only if nothing else in the file still calls it.

In `apps/mobile/src/app/(tabs)/library/index.tsx`: remove `liked` and `onToggleLike={() => toggleLike(track.id)}` from the `<TrackRow>` call around line 290-301. Remove the `toggleLike` selector (`likedTrackIds` stays — it feeds `likedIds = Array.from(likedTrackIds)` elsewhere in the file).

In `apps/mobile/src/app/(tabs)/search/results.tsx`: remove `liked={likedTrackIds.has(track.id)}` and `onToggleLike={() => toggleLike(track.id)}` from the `<TrackRow>` call. Remove both the `likedTrackIds` and `toggleLike` selectors (neither is used anywhere else in this file).

In `apps/mobile/src/app/dev-ui-kit.tsx`: remove `durationLabel="4:18"`, `liked={liked}`, `onToggleLike={() => setLiked((v) => !v)}` from the first `TrackRow`, and remove `durationLabel="3:24"` from the second `TrackRow` (`<TrackRow index={2} title="Resonant Field" artist="Solaris Echo" isPlaying explicit />`). Remove the now-unused `const [liked, setLiked] = useState(false);` local state if nothing else in the file reads it. Leave the `QueueRow` line directly below untouched (Queue is out of scope).

For every file touched in this step: after editing, run `grep -n "toggleLike\|isLiked\|likedTrackIds\|formatDuration\|const \[liked" <file>` and confirm every remaining match is a real usage (not a now-dangling, unused declaration) — `npx tsc --noEmit` in Step 4 below will also catch any unused-variable case directly.

- [ ] **Step 4: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass. Any "declared but never read" error identifies a leftover dead selector from Step 3 to delete.

Run: `npm run build:web`
Expected: build succeeds.

- [ ] **Step 5: Visual + behavioral check**

Serve the web build locally and check Home ("Jump back in"), Search results, Library, Liked Songs, a Playlist, an Album, and an Artist page:
- Every track row shows artwork, title, artist, explicit badge (where applicable), and the ⋮ button — no heart, no duration.
- Tapping ⋮ on any track opens the options sheet with a "Like"/"Unlike" row at the top; toggling it updates the icon/label immediately.
- After liking a track from one screen's sheet, reopen the same sheet from a different screen for the same track (e.g. like from Search, then open the sheet for that track on Home) and confirm it now reads "Unlike" — and that the track now appears in Liked Songs.
- The mini-player's own heart (`src/components/mini-player.tsx`) is still present and unaffected.
- Test at a ~390px mobile viewport and at desktop width.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/list-row.tsx apps/mobile/src/app/sheets/options.tsx apps/mobile/src/app/playlist/\[id\].tsx apps/mobile/src/app/album/\[id\].tsx apps/mobile/src/app/artist/\[id\].tsx "apps/mobile/src/app/(tabs)/library/liked-songs.tsx" "apps/mobile/src/app/(tabs)/library/index.tsx" "apps/mobile/src/app/(tabs)/search/results.tsx" apps/mobile/src/app/dev-ui-kit.tsx
git commit -m "fix: remove heart/duration from track rows; like moves to the track options sheet"
```

---

## Final Report (after all tasks)

Before asking for visual approval, assemble:
- The root-cause explanation for Task 3 (reproduced above) in plain language.
- The exact file list touched per task (this plan's Files sections, consolidated).
- Before/after screenshots: the nav pill on a root-level screen (missing → present, then → glass), and a track row (with heart/duration → without).
- Full verification results: `tsc`, lint, `npm test`, `npm run build:web`, and the live-browser checks from each task's Step 5/visual-check, at both ~390px and desktop widths.
- The Review Focus list above, with what was confirmed for each line and any limitation (in particular: Safari-engine `backdrop-filter` rendering could not be automated in this environment).
- A local preview URL.
- Confirmation that nothing was committed to a shared branch, pushed, merged, or deployed — only local commits per task, awaiting the user's explicit approval.
