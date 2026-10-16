# RU/EN Localization Completion & Late Night Flow Vertical Discovery Player

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two independent, separately-implementable improvements. (A) Complete the existing RU/EN localization system's coverage — today it's a solid, well-built system (centralized keys, instant switching, persisted) used by only ~17% of screens — so switching to Russian actually translates the whole interface, not just Home/Settings/Player chrome. (B) Turn the Home page's Late Night Flow waveform into the entry point for a full-screen, TikTok-style vertical swipe music discovery player, built entirely on top of the existing Dynamic Premium Player architecture and audio engine — no second playback system, no redesign of the approved Home page, nav pill, or Now Playing screen.

**Architecture — Task A (localization):** `apps/mobile/src/lib/i18n.ts` (a flat `Record<key, string>` per locale, TypeScript-enforced EN/RU parity) and `apps/mobile/src/state/locale-store.ts` (`useLocaleStore`, Zustand + persist + the same SSR-safe `skipHydration` pattern already used by `player-store.ts`, exposing `useAppStrings()` → `{ locale, setLocale, t }`) are already correct and need no redesign. The work is entirely coverage: audit each remaining screen/sheet, add any missing keys (reusing existing keys wherever one already covers the string — several do, e.g. `songsHeader`/`filterArtists`/`filterAlbums`/`filterPlaylists` already exist and are simply unused in some places), write natural (not literal-machine-translated) Russian matching the existing table's voice, and wire `useAppStrings()` into the component. A separate `dashboard-i18n.ts` table (Artist Dashboard only) is explicitly out of scope — it's already a deliberate, working split documented in `i18n.ts`'s own header comment; do not merge it in.

**Architecture — Task B (discovery player):** A new, additive feature built from existing primitives, not new state. `apps/mobile/src/state/player-surface.ts`'s `carouselPos`/`carouselTarget` (module-level shared Reanimated mutables representing "current position in the play queue, as a continuous float, for animation") and `canStep`, `CAROUSEL_SPRING`, `REDUCED_SETTLE_MS`, and `apps/mobile/src/lib/gesture-math.ts`'s `resolveSwipe`/`rubberBand` are already axis-agnostic pure functions/shared values — they don't know or care whether the drag is horizontal or vertical. `apps/mobile/src/components/player/artwork-carousel.tsx` (the Now Playing screen's existing horizontal swipe-to-change-track component) is the exact template to mirror on the vertical axis, reusing the same utilities and the same `usePlayerStore().swipeTo(dir)` call that already performs the real track change (with its existing `SWIPE_AUDIO_DELAY_MS` debounce). `apps/mobile/src/components/player/player-background.tsx` (the adaptive palette background) already reads `carouselPos` generically and needs zero changes to work in the new screen too. The new screen is a sibling route under `apps/mobile/src/app/player/` (e.g. `discover.tsx`), which automatically inherits the existing `player` Stack.Screen's `transparentModal` treatment from root `_layout.tsx` with no changes there. Exactly one line changes in the existing, approved Home screen: the Late Night Flow banner's `onPress`.

**Tech Stack:** React Native + Expo Router, Zustand, `react-native-gesture-handler` + `react-native-reanimated` (already used identically by `ArtworkCarousel`/`usePlayerSheet`), no new dependencies for either task.

**Spec:** The user's own request messages (the full "two high-priority improvements" brief, plus the follow-up confirming "Option A: Full-Screen Vertical Music Discovery Player" as the approved interaction design for Task B) are the spec; both are reproduced in Global Constraints below.

## Global Constraints

Reproduced from the user's request, binding on every task:

- **Do not redesign** the Home page, navigation pill, Late Night Flow artwork/waveform visual, Dynamic Premium Player, or any other existing approved component. Both tasks are additive/functional only.
- **Localization:**
  - Improve the existing system; do not create a second one.
  - Russian must be natural and grammatically correct — not literal machine translation. Use terminology appropriate for a modern music streaming platform.
  - Translate navigation, buttons, settings, search, library, playlists, albums, artist profiles, donation flows, notifications, dialogs, error messages, empty states, and other user-facing UI text.
  - Preserve original artist names, song titles, album titles, brand names, and Mmusic branding unless an official localized title already exists. Never translate lyrics.
  - Switching RU/EN updates the interface immediately, with no page reload.
  - The selected language persists across refreshes and navigation.
  - Dynamically generated interface text also follows the selected language.
  - No mixed Russian/English UI except proper names and intentional brand terms.
  - Check text overflow, button widths, typography, and layout in both languages.
  - Centralized translation keys and reusable localization utilities — no hardcoded translations scattered through components.
- **Discovery player:**
  - Tapping/clicking the Late Night Flow waveform opens a full-screen immersive player; the selected track starts playing through the existing audio engine; artwork/visualizer, title, artist, and minimal playback controls are shown.
  - Swipe up → next track; swipe down → previous track. Touch on iPhone/Android; mouse drag AND trackpad scroll on desktop. Smooth, premium transitions. Exactly one gesture changes exactly one track — momentum/inertial scrolling must never cause multiple accidental skips. Must not interfere with the existing playback-progress seek gesture.
  - Stop the previous track and play the new one on navigation; keep artwork/title/artist/visualizer in sync; only one audio source ever plays; Play/Pause/Next/Previous all work; swiping back returns to the previous track; never pretend a track with no playable audio is playing; handle iOS Safari's autoplay restrictions gracefully.
  - Keep the existing Late Night Flow waveform visual style and the dark premium Mmusic aesthetic; smooth transitions; preserve existing waveform animation where possible; no unnecessary text/decorative badges/visual noise — a premium discovery feature, not a TikTok clone.
  - Reuse the existing Dynamic Premium Player architecture and audio engine — do not create a second, independent playback system, and do not introduce swipe handlers that conflict with the existing ones. The new vertical experience coexists with the current horizontal gestures and player behavior (confirmed in investigation: they're on different screens/routes and never compete).
  - Minimal close/back control back to Home; preserve playback state when closing.
- **Workflow:** investigate → plan → implement the two tasks separately → independent code review → fix critical/important issues → provide a local preview URL. Run TypeScript checks, lint, tests, and the web production build. Test RU localization across all screens, RU/EN switching + persistence, 390px mobile layout, desktop behavior, waveform tap, vertical swipe (touch/mouse/trackpad), continuous navigation, playback sync, back navigation + player state, iOS Safari autoplay compatibility, existing horizontal player gestures, no broken routes/console errors/regressions.
- **Do not commit, push, merge, or deploy anything without explicit approval.** No unrelated design changes.

## Review Focus

- Does the newly-wired Russian actually read naturally for a music-streaming audience (not literal/awkward machine-translation phrasing) — the reviewer should quote several of the new translations and judge them on their own merits, the same way the investigation judged the existing 108 keys as "good, not literal."
- Is there genuinely only one playback/audio system after Task B — does the new screen call `usePlayerStore`'s existing `play`/`togglePlayPause`/`swipeTo`, or does anything accidentally create a second `<audio>` element, a second queue, or duplicate playback state?
- Does the vertical swipe resolve to exactly one track change per gesture under simulated trackpad momentum (many rapid small wheel events after the user's physical gesture ends) — not multiple skips?
- Does `now-playing.tsx`'s existing horizontal carousel-swipe and vertical collapse-swipe still work completely unmodified after this plan — proving the new vertical gesture genuinely doesn't interfere with them (they're different routes, but verify live, not just by inspection)?
- Does switching locale update every already-mounted, newly-wired screen instantly (no reload) and does the choice survive a real page refresh?

---

## TASK GROUP A — RU/EN Localization Completion

### Task 1: New shared/consolidated keys + Search screens

**Files:**
- Modify: `apps/mobile/src/lib/i18n.ts`
- Modify: `apps/mobile/src/app/(tabs)/search/results.tsx`
- Modify: `apps/mobile/src/app/(tabs)/search/index.tsx`
- Modify: `apps/mobile/src/app/(tabs)/search/genre/[id].tsx`
- Modify: `apps/mobile/src/app/(tabs)/search/all-genres.tsx`

**Interfaces:**
- Produces: new keys on `EN_STRINGS`/`RU_STRINGS` in `i18n.ts` (exact names given below) — consumed by this task's own files and potentially reused by later tasks if the same string recurs elsewhere (check before adding a duplicate).
- Consumes: `useAppStrings()` from `@/state/locale-store` (already exists, unchanged).

- [ ] **Step 1: Add new keys to `i18n.ts`**

In `apps/mobile/src/lib/i18n.ts`, add to `EN_STRINGS` (after the existing `// Search` section, i.e. after `browseAll: 'Browse All',`):
```ts
searchTopResult: 'Top Result',
searchArtistsHeader: 'Artists',
searchAlbumsHeader: 'Albums',
searchPlaylistsHeader: 'Playlists',
searchFeaturedPlaylists: 'Featured Playlists',
searchClearLabel: 'Clear search',
exploreAllGenres: 'Explore All Genres',
searchEmptyTitle: 'Search Mmusic',
searchEmptyHint: 'Find the artists, songs, and playlists you love.',
genreTrendingNow: 'Trending right now',
```
and the matching Russian to `RU_STRINGS` in the same position:
```ts
searchTopResult: 'Лучший результат',
searchArtistsHeader: 'Артисты',
searchAlbumsHeader: 'Альбомы',
searchPlaylistsHeader: 'Плейлисты',
searchFeaturedPlaylists: 'Подборки плейлистов',
searchClearLabel: 'Очистить поиск',
exploreAllGenres: 'Все жанры',
searchEmptyTitle: 'Искать в Mmusic',
searchEmptyHint: 'Находите любимых артистов, треки и плейлисты.',
genreTrendingNow: 'В тренде сейчас',
```
(`searchEmptyHint` is a plausible companion string for the `searchEmptyTitle` empty state — if `results.tsx`'s actual `EmptyState` in Step 2 has no `hint`/subtitle prop currently set, read the component to confirm whether to use it; if it already has a different hardcoded hint, use that English text as the key's value instead of inventing new copy.)

**Important — check before adding a new key:** `songsHeader: 'Треки'`, `filterArtists: 'Артисты'`, `filterAlbums: 'Альбомы'`, and `filterPlaylists: 'Плейлисты'` **already exist** in `i18n.ts` (Library section). Do NOT add `searchSongsHeader`/duplicate artist/album/playlist-header keys if these existing keys already say the exact right thing for the context you're wiring — reuse them. (`searchArtistsHeader`/`searchAlbumsHeader`/`searchPlaylistsHeader` above are only needed if `results.tsx`'s section headers read differently in context — verify by reading the file in Step 2 before deciding whether to use the new keys or the existing `filterArtists`/`filterAlbums`/`filterPlaylists`/`songsHeader` ones; delete the ones you don't end up needing from your `i18n.ts` edit.)

- [ ] **Step 2: Wire `search/results.tsx`**

Read the file in full. Import `useAppStrings` from `@/state/locale-store` and call `const { t } = useAppStrings();` inside the component. Replace every hardcoded user-facing string with the matching key — confirmed sites from investigation: line 78's `accessibilityLabel="Clear search"` → `t('searchClearLabel')`; line 94's `title="Search Mmusic"` → `t('searchEmptyTitle')`; lines 96 and 106's `actionLabel="Explore All Genres"` → `t('exploreAllGenres')`; line 163's `<ThemedText variant="headline-sm">Songs</ThemedText>` → `t('songsHeader')` (reuse the existing key — do not invent a new one); line 185's `<ThemedText variant="headline-sm">Artists</ThemedText>` → `t('filterArtists')` (reuse) or `t('searchArtistsHeader')` if the existing Library-filter wording doesn't fit this context — judge from reading the surrounding section header style. Check the rest of the file for any other hardcoded strings (album/playlist section headers, a "Featured Playlists" label, etc.) not caught by the investigation's spot-check and wire those too, adding any further key to `i18n.ts` (Step 1) following the same voice if genuinely needed.

- [ ] **Step 3: Wire `search/index.tsx`, `search/genre/[id].tsx`, `search/all-genres.tsx`**

Read each file in full. Wire `useAppStrings()` the same way. The investigation flagged "Trending right now" (`genreTrendingNow`) as likely belonging to one of these files (probably `genre/[id].tsx` or `index.tsx` — confirm by grepping `"Trending"` across these three files) — wire it to the new key. Audit each file for any other hardcoded user-facing text (headers, empty states, a11y labels) and wire/add keys the same way as Step 2. Preserve genre/category names themselves if they're data (e.g. "Hip-Hop & R&B," "Kyrgyz Music") — those are content, not UI chrome, same principle as track/artist names; do not invent translations for them unless they're clearly static UI labels rather than catalog data (check `src/mocks/` to tell the difference).

- [ ] **Step 4: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass (TypeScript will error if `RU_STRINGS` is missing any key `EN_STRINGS` has — this is the built-in parity check).

- [ ] **Step 5: Visual check — both languages**

Serve the web build locally. On Search (results for a query, the genre list, "All Genres"): switch to Russian via Settings, confirm every string you wired now shows natural Russian with no leftover English chrome (track/artist/album/genre names stay as-is), confirm nothing overflows or wraps awkwardly at a ~390px mobile viewport, switch back to English and confirm it's unchanged from before this task.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/i18n.ts "apps/mobile/src/app/(tabs)/search/results.tsx" "apps/mobile/src/app/(tabs)/search/index.tsx" "apps/mobile/src/app/(tabs)/search/genre/[id].tsx" "apps/mobile/src/app/(tabs)/search/all-genres.tsx"
git commit -m "feat(i18n): localize Search screens"
```

---

### Task 2: Library wiring — fix the Liked Songs gap, cover the rest of Library

**Files:**
- Modify: `apps/mobile/src/lib/i18n.ts` (only if new keys are genuinely needed — see Step 1)
- Modify: `apps/mobile/src/app/(tabs)/library/liked-songs.tsx`
- Modify: `apps/mobile/src/app/(tabs)/library/index.tsx`

**Interfaces:**
- Consumes: `useAppStrings()`, and the already-existing `likedSongs`, `yourLibrary`, `librarySearchPlaceholder`, `cancel`, `filterAll`/`filterPlaylists`/`filterArtists`/`filterAlbums`/`filterDownloaded`, `recentlyAdded`, `sortAlphabetical`, `libraryEmptyGeneric`, `libraryEmptyDownloaded`, `libraryNoMatchesPrefix`/`libraryNoMatchesSuffix`, `songsHeader` keys (all already in `i18n.ts` — this task is primarily a WIRING task, not a key-creation task, since the investigation found the Library section of `i18n.ts` is already comprehensive; the bug is that `liked-songs.tsx:59` hardcodes `"Liked Songs"` instead of using the existing `likedSongs` key).

- [ ] **Step 1: Audit for any genuinely missing keys**

Read both files in full. Cross-reference every user-facing string against the already-existing Library-section keys listed above. For the overwhelming majority, you should find an existing key already covers the string (if not, that's the actual gap to add — e.g. specific toast messages at `liked-songs.tsx:81,84` the investigation flagged as hardcoded, which may need new keys if no existing one fits; read their exact current English text first). Add any genuinely new key to `i18n.ts` (both `EN_STRINGS` and `RU_STRINGS`) in the same style as Task 1's Step 1, only for strings with no existing match.

- [ ] **Step 2: Fix the Liked Songs wiring bug and wire the rest**

In `apps/mobile/src/app/(tabs)/library/liked-songs.tsx`: import `useAppStrings`, replace the hardcoded `"Liked Songs"` at line 59 with `t('likedSongs')` (the existing key). Replace the two hardcoded a11y label/toast strings at lines 81 and 84 with their matching keys from Step 1. Audit the rest of the file for anything else hardcoded.

In `apps/mobile/src/app/(tabs)/library/index.tsx`: wire `useAppStrings()` if not already present, confirm every filter chip, section header, and empty state already uses the existing keys (`filterAll` etc.) — if any are still hardcoded English despite a matching key existing, that's the fix; wire them.

- [ ] **Step 3: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

- [ ] **Step 4: Visual check — both languages**

Serve the web build locally. On Library and Liked Songs: switch to Russian, confirm "Liked Songs" now reads "Любимые треки" (the existing `likedSongs` RU value), confirm filters/empty-states/toasts are in Russian, check at ~390px mobile.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/i18n.ts "apps/mobile/src/app/(tabs)/library/liked-songs.tsx" "apps/mobile/src/app/(tabs)/library/index.tsx"
git commit -m "feat(i18n): fix Liked Songs localization gap, complete Library coverage"
```

---

### Task 3: Playlist/Album/Artist detail screens — consolidate duplicated action strings

**Files:**
- Modify: `apps/mobile/src/lib/i18n.ts`
- Modify: `apps/mobile/src/app/playlist/[id].tsx`
- Modify: `apps/mobile/src/app/album/[id].tsx`
- Modify: `apps/mobile/src/app/artist/[id].tsx`

**Interfaces:**
- Produces: new shared keys for the Save/Remove/Download action-row strings (used identically across all three detail screens today as separate hardcoded copies — consolidating into one set of keys per the user's explicit "centralized translation keys... do not scatter hardcoded translations" requirement).
- Consumes: `useAppStrings()`.

- [ ] **Step 1: Add consolidated keys to `i18n.ts`**

Add to `EN_STRINGS` (a new `// Detail screen actions (Playlist/Album/Artist)` section):
```ts
removedFromLibrary: 'Removed from Library',
savedToLibrary: 'Saved to Library',
downloadRemoved: 'Download removed',
markedForOfflineDemo: 'Marked for offline (demo — no audio is stored yet)',
removePlaylistFromLibrary: 'Remove playlist from Library',
savePlaylist: 'Save playlist',
removeAlbumFromLibrary: 'Remove album from Library',
saveAlbum: 'Save album',
removeDownload: 'Remove download',
download: 'Download',
```
and to `RU_STRINGS`:
```ts
removedFromLibrary: 'Удалено из библиотеки',
savedToLibrary: 'Сохранено в библиотеку',
downloadRemoved: 'Загрузка удалена',
markedForOfflineDemo: 'Отмечено для офлайн-доступа (демо — аудио пока не сохраняется)',
removePlaylistFromLibrary: 'Удалить плейлист из библиотеки',
savePlaylist: 'Сохранить плейлист',
removeAlbumFromLibrary: 'Удалить альбом из библиотеки',
saveAlbum: 'Сохранить альбом',
removeDownload: 'Удалить загрузку',
download: 'Загрузить',
```
Read `playlist/[id].tsx` and `album/[id].tsx` first (both already read in full earlier this session — the exact hardcoded strings are at `playlist/[id].tsx:93-109` and `album/[id].tsx:73-90` for the `IconButton` `accessibilityLabel`s and the `showToast(...)` calls) to confirm these key names and values match the files' actual current text exactly before using them — adjust the key list above only if the real text differs from what's assumed here.

- [ ] **Step 2: Wire all three detail screens**

In each of `playlist/[id].tsx`, `album/[id].tsx`, `artist/[id].tsx`: import `useAppStrings` (if not already present — `artist/[id].tsx` may not have this exact action-row pattern; read it first and confirm whether it has an equivalent Save/Follow row, and reuse `t('...')` calls from Step 1's keys only where the string genuinely matches — `artist/[id].tsx`'s "Follow"/"Following" buttons are a different concept, do not force-fit the playlist/album keys onto them; add separate keys for artist-specific strings if they're hardcoded and lack a match). Replace every hardcoded `accessibilityLabel`/toast string with its `t('...')` call from Step 1's new keys.

- [ ] **Step 3: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

- [ ] **Step 4: Visual check — both languages**

Serve the web build locally. On a Playlist, an Album, and an Artist page: toggle Save/Download in Russian, confirm the toast messages and a11y labels are in natural Russian, confirm track titles/artist names/album titles stay untranslated (they're data), check at ~390px mobile.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/i18n.ts apps/mobile/src/app/playlist/\[id\].tsx apps/mobile/src/app/album/\[id\].tsx apps/mobile/src/app/artist/\[id\].tsx
git commit -m "feat(i18n): consolidate and localize Playlist/Album/Artist detail actions"
```

---

### Task 4: Sheets, dialogs, donation flow, and error/empty states

**Files:**
- Modify: `apps/mobile/src/lib/i18n.ts`
- Modify: `apps/mobile/src/app/sheets/support.tsx`
- Modify: `apps/mobile/src/app/sheets/add-to-playlist.tsx`
- Modify: `apps/mobile/src/app/sheets/notifications.tsx`
- Modify: `apps/mobile/src/app/sheets/options.tsx` (only the hardcoded rows found in Step 2, if any — `t('donate')` is already wired per this session's earlier work)
- Modify: `apps/mobile/src/app/+not-found.tsx`

**Interfaces:**
- Produces: new keys for the donation/support flow, add-to-playlist sheet, notifications empty state, and the 404 page.
- Consumes: `useAppStrings()`.

- [ ] **Step 1: Add new keys to `i18n.ts`**

Read `support.tsx`, `add-to-playlist.tsx`, `notifications.tsx`, and `+not-found.tsx` in full first (confirm the investigation's cited strings — `support.tsx:89,134` "Support Artist"/"Select an amount"; `add-to-playlist.tsx:60` "Add to Playlist"; `notifications.tsx:52` "No notifications"/"New releases and support receipts will show up here."; `+not-found.tsx:23` "Page not found" — and any others you find while reading). Add to `EN_STRINGS` (a new `// Sheets & dialogs` section):
```ts
supportArtistTitle: 'Support Artist',
selectAnAmount: 'Select an amount',
addToPlaylistTitle: 'Add to Playlist',
notificationsEmptyTitle: 'No notifications',
notificationsEmptyHint: 'New releases and support receipts will show up here.',
pageNotFoundTitle: 'Page not found',
```
and to `RU_STRINGS`:
```ts
supportArtistTitle: 'Поддержать артиста',
selectAnAmount: 'Выберите сумму',
addToPlaylistTitle: 'Добавить в плейлист',
notificationsEmptyTitle: 'Нет уведомлений',
notificationsEmptyHint: 'Здесь появятся новые релизы и квитанции поддержки.',
pageNotFoundTitle: 'Страница не найдена',
```
(`supportArtistTitle` is deliberately a distinct key from the existing `donate`/`supportTab` keys even though they're related concepts — the existing ones are short nav/tab labels, this is a sheet's own title; do not collapse them into one key used in two visually different contexts without first confirming via the file reads above that the surrounding copy is actually identical, not just similar.) Add any further key you find while reading these four files that isn't covered above, following the same voice.

- [ ] **Step 2: Wire all four/five files**

Import `useAppStrings` and replace every hardcoded string in each file with its `t('...')` call. In `options.tsx`, only touch rows that are still hardcoded — the `donate` key is already wired there from earlier session work; don't re-wire what's already correct, just audit for anything else in that file still hardcoded (e.g. "Add to playlist," "View artist," "Go to album," "Share track" menu-row labels, if still literal strings — add keys and wire if so).

- [ ] **Step 3: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

- [ ] **Step 4: Visual check — both languages**

Serve the web build locally. Open the Support/donate sheet, Add to Playlist sheet, Notifications (if reachable in this demo), and a non-existent route (to trigger `+not-found`) in Russian — confirm natural Russian throughout, no leftover English UI chrome. Check at ~390px mobile.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/i18n.ts apps/mobile/src/app/sheets/support.tsx apps/mobile/src/app/sheets/add-to-playlist.tsx apps/mobile/src/app/sheets/notifications.tsx apps/mobile/src/app/sheets/options.tsx apps/mobile/src/app/+not-found.tsx
git commit -m "feat(i18n): localize sheets, donation flow, and error/empty states"
```

---

### Task 5: Final sweep, remaining screens, and cross-language layout verification

This is the catch-all task: after Tasks 1-4 cover the specifically-identified gaps, there are very likely more hardcoded strings across the ~93-file app that the investigation's representative sample didn't individually enumerate. This task's job is to find and close the remaining gaps, then do the full bilingual layout/regression pass.

**Files:**
- Modify: `apps/mobile/src/lib/i18n.ts` (as needed)
- Modify: any remaining `apps/mobile/src/app/**/*.tsx` or `apps/mobile/src/components/**/*.tsx` file found to contain hardcoded user-facing English text and not already covered by Tasks 1-4 (full list to be determined by this task's own audit — see Step 1).

**Interfaces:**
- Consumes/produces: `i18n.ts` keys, `useAppStrings()`, same conventions as every prior task in this group.

- [ ] **Step 1: Systematic audit**

Run `grep -rln "useAppStrings\|from '@/state/locale-store'" apps/mobile/src/app apps/mobile/src/components` and compare against the full file list (`find apps/mobile/src/app apps/mobile/src/components -name "*.tsx"`) to get the precise list of files that still never touch localization. Exclude: the Artist Dashboard screens (own `dashboard-i18n.ts` system, out of scope — confirm by checking whether a file already imports `useDashboardStrings`), any file covered by Tasks 1-4, and any file containing only non-UI logic (hooks, pure utility components with no visible text). For every remaining file, read it and check for hardcoded visible strings: `<ThemedText>`/`<Text>` literal children, `placeholder=`, `accessibilityLabel=`, `title=`, toast/alert messages, empty-state copy. For each one found, add a matching key (checking first whether an existing key already fits, same discipline as every prior task) and wire it.

- [ ] **Step 2: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`
Expected: all pass.

- [ ] **Step 3: Full bilingual regression pass**

Serve the web build locally (`npm run build:web` then serve `dist/`, or `npm run web` for the dev server). With the locale set to Russian:
- Walk through Home, Search (query + results + genres), Library (all filters + Liked Songs), a Playlist, an Album, an Artist page, Profile, Settings (every section), the Support/donate sheet, Add to Playlist, Notifications, the player's Now Playing screen (including Lyrics/Queue/Audio tabs), and a 404 — confirm no raw, un-translated English UI chrome anywhere except proper names/brand terms.
- Specifically re-check the investigation's flagged overflow-risk strings in context: the bottom nav tab labels (RU is 43-75% longer), the `donate`/`supportArtistTitle` buttons (RU `Поддержать артиста` is ~3x longer than EN `Donate`), and `infinityAutoplay` in Settings (RU ~82% longer) — confirm none of these wrap awkwardly, clip, or break their container's layout at a ~390px mobile viewport. If any genuinely overflow, this task may need a small, targeted style fix (e.g. allow a second line, reduce a fixed width) — keep any such fix minimal and scoped to the specific broken element, not a broader redesign (Global Constraints: no redesign of approved components).
- Switch back to English, confirm no regression anywhere.
- Toggle RU → EN → RU again without a page reload and confirm every already-mounted screen updates instantly each time.
- Refresh the page while set to Russian and confirm it's still Russian after reload (persistence).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/i18n.ts <every file touched in Step 1 — list explicitly in the commit, not a wildcard>
git commit -m "feat(i18n): complete remaining localization coverage and verify bilingual layout"
```

---

## TASK GROUP B — Late Night Flow Vertical Discovery Player

### Task 6: Gesture math additions + the vertical `DiscoveryFeed` component

**Files:**
- Modify: `apps/mobile/src/lib/gesture-math.ts`
- Create: `apps/mobile/src/components/player/discovery-feed.tsx`

**Interfaces:**
- Produces: `DISCOVERY_ACTIVE_OFFSET_Y`, `DISCOVERY_FAIL_OFFSET_X` constants (gesture-math.ts); `export function DiscoveryFeed({ size }: { size: { width: number; height: number } })` component — consumed by Task 7's new route.
- Consumes: `resolveSwipe`, `rubberBand` (gesture-math.ts, unchanged — no tap gesture needed here, unlike `ArtworkCarousel`'s optional tap-to-open, since the discovery screen's Play/Pause is a dedicated button, not a tap-anywhere-on-cover); `carouselPos`, `carouselTarget`, `canStep`, `CAROUSEL_SPRING`, `REDUCED_SETTLE_MS`, `usePlayPosition` (player-surface.ts, unchanged); `usePlayerStore`'s `queue`, `order`, `currentIndex`, `repeat`, `swipeTo`, `peekNeighbors` (unchanged).

- [ ] **Step 1: Add the vertical gesture thresholds**

In `apps/mobile/src/lib/gesture-math.ts`, add near the existing `CAROUSEL_ACTIVE_OFFSET_X`/`CAROUSEL_FAIL_OFFSET_Y` constants:
```ts
/** The Late Night Flow discovery feed claims a vertical drag after this many
 * points — mirrors CAROUSEL_ACTIVE_OFFSET_X exactly, just on the other axis,
 * for the same committed feel. */
export const DISCOVERY_ACTIVE_OFFSET_Y = 12;
/** …and gives it up (a stray horizontal movement) once the finger has moved
 * this far horizontally first — mirrors CAROUSEL_FAIL_OFFSET_Y. */
export const DISCOVERY_FAIL_OFFSET_X = 10;
```

- [ ] **Step 2: Create `DiscoveryFeed`**

Create `apps/mobile/src/components/player/discovery-feed.tsx`, closely mirroring `apps/mobile/src/components/player/artwork-carousel.tsx`'s structure (read it in full first — it's the exact template) but on the vertical axis and at full-screen size instead of a small square cover:

```tsx
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Artwork } from '@/components/ui';
import { ParticleWaveArtwork } from '@/components/ui/particle-wave/particle-wave-artwork';
import { DISCOVERY_ACTIVE_OFFSET_Y, DISCOVERY_FAIL_OFFSET_X, resolveSwipe, rubberBand } from '@/lib/gesture-math';
import { getTrackById, type TrackId } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { CAROUSEL_SPRING, REDUCED_SETTLE_MS, canStep, carouselPos, carouselTarget, usePlayPosition } from '@/state/player-surface';

/**
 * Full-screen vertical swipe feed for the Late Night Flow discovery player —
 * swipe up for the next track, down for the previous one. Reuses the exact
 * same shared position/animation state and swipe-resolution math as the
 * horizontal `ArtworkCarousel` in Now Playing (just on the Y axis), so the
 * two never conflict: they live on different screens and nothing here
 * duplicates playback state — `swipeTo` is the same call Now Playing's own
 * carousel makes.
 *
 * Only the CURRENT slide renders the reactive `ParticleWaveArtwork` (audio-
 * visualizer WebGL); the previous/next neighbour slides show a plain static
 * cover — showing three live WebGL contexts at once was a real performance
 * problem identified and fixed elsewhere in this app (Living Moods
 * prototype), and the neighbours are only glimpsed mid-drag here anyway.
 */
export function DiscoveryFeed({ size }: { size: { width: number; height: number } }) {
  const step = size.height;
  const reduceMotion = useReducedMotion();
  const pos = usePlayPosition();
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const swipeTo = usePlayerStore((s) => s.swipeTo);

  const { prevId, nextId } = useMemo(
    () => usePlayerStore.getState().peekNeighbors(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue, order, currentIndex, repeat],
  );
  const currentId = queue[currentIndex];

  const reduce = useSharedValue(reduceMotion);
  useEffect(() => {
    reduce.value = reduceMotion;
  }, [reduceMotion, reduce]);

  const dragStart = useSharedValue(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-DISCOVERY_ACTIVE_OFFSET_Y, DISCOVERY_ACTIVE_OFFSET_Y])
        .failOffsetX([-DISCOVERY_FAIL_OFFSET_X, DISCOVERY_FAIL_OFFSET_X])
        .onStart(() => {
          cancelAnimation(carouselPos);
          dragStart.value = carouselPos.value;
        })
        .onUpdate((e) => {
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          // Swipe UP (negative translationY) moves to the NEXT track —
          // same sign convention as the horizontal carousel's "drag left = next".
          const raw = dragStart.value - e.translationY / step;
          const offset = rubberBand((base - raw) * step, canPrev, canNext);
          carouselPos.value = base - offset / step;
        })
        .onEnd((e) => {
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          const offset = (base - carouselPos.value) * step;
          const result = resolveSwipe(offset, e.velocityY, step, canPrev, canNext);
          const dir = result === 'next' ? 1 : result === 'prev' ? -1 : 0;
          const target = base + dir;
          carouselTarget.value = target;
          carouselPos.value = reduce.value
            ? withTiming(target, { duration: REDUCED_SETTLE_MS, easing: Easing.out(Easing.quad) })
            : withSpring(target, { ...CAROUSEL_SPRING, velocity: -e.velocityY / step });
          // Exactly one gesture → exactly one track: `dir` can only ever be
          // -1, 0, or 1 here (resolveSwipe's contract), so this can never
          // fire more than one `swipeTo` per released gesture.
          if (dir !== 0) scheduleOnRN(swipeTo, dir as 1 | -1);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateY: carouselPos.value * step }] }));

  const slots: { id: TrackId | undefined; at: number; current: boolean }[] = [
    { id: prevId, at: pos - 1, current: false },
    { id: currentId, at: pos, current: true },
    { id: nextId, at: pos + 1, current: false },
  ];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: size.width, height: size.height }, styles.clip]}>
        <Animated.View style={[StyleSheet.absoluteFill, stripStyle]}>
          {slots.map(({ id, at, current }) =>
            id ? <Slot key={`slot-${at}`} trackId={id} at={at} size={size} step={step} current={current} playing={isPlaying} /> : null,
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Slot({
  trackId,
  at,
  size,
  step,
  current,
  playing,
}: {
  trackId: TrackId;
  at: number;
  size: { width: number; height: number };
  step: number;
  current: boolean;
  playing: boolean;
}) {
  const track = getTrackById(trackId);
  const style = useAnimatedStyle(() => ({ opacity: fade(at) }));
  return (
    <Animated.View style={[styles.slot, { width: size.width, height: size.height, top: at * step }, style]}>
      {current ? (
        <ParticleWaveArtwork uri={track?.coverUri ?? ''} trackId={trackId} playing={playing} />
      ) : (
        <Artwork uri={track?.coverUri} size={size.width} />
      )}
    </Animated.View>
  );

  function fade(position: number): number {
    'worklet';
    return Math.min(1, Math.max(0, (1 - Math.abs(carouselPos.value - position)) * 4));
  }
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  slot: { position: 'absolute', left: 0 },
});
```

Before finalizing: read `apps/mobile/src/components/ui/particle-wave/particle-wave-artwork.web.tsx`'s actual exported prop names (`ParticleWaveArtworkProps`) and the native `particle-wave-artwork.tsx` fallback — the snippet above assumes `uri`/`trackId`/`playing` based on this plan's investigation; adjust the exact prop names/types to match if they differ, and confirm the `.web.tsx`/`.tsx` platform-split import path (`@/components/ui/particle-wave/particle-wave-artwork`, no extension) resolves the same way `card.tsx` already imports it. Also confirm `Artwork`'s exact prop signature (likely `uri`/`size`/optionally `radius`) from `@/components/ui` before finalizing the neighbour-slot fallback.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint, test, build**

Run: `cd apps/mobile && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/gesture-math.ts apps/mobile/src/components/player/discovery-feed.tsx
git commit -m "feat: vertical DiscoveryFeed component for Late Night Flow"
```

---

### Task 7: The discovery player route — minimal chrome

**Files:**
- Create: `apps/mobile/src/app/player/discover.tsx`

**Interfaces:**
- Consumes: `DiscoveryFeed` (Task 6), `PlayerBackground` (`@/components/player/player-background`, unchanged), `usePlayerStore` (unchanged), `useAppStrings` (unchanged), `goBack` (`@/lib/navigation`, unchanged).
- Produces: a new route reachable at `/player/discover`, consumed by Task 8's Home wiring.

- [ ] **Step 1: Implement the route**

Create `apps/mobile/src/app/player/discover.tsx`. This mirrors `now-playing.tsx`'s overall shell (root `ThemedView`, `SafeAreaView`, adaptive `PlayerBackground`) but is deliberately much more minimal per the user's explicit "minimal visual clutter... not a TikTok clone" direction: no lyrics preview, no Queue/Support/Audio tab row, no shuffle/repeat/like controls, no seek bar (TikTok-style feeds conventionally have none, and the brief's own Step 1 lists only "playback controls with minimal visual clutter" — Play/Pause, plus swipe for next/previous, is the whole control surface). Read `now-playing.tsx` and `use-player-sheet.ts` once more directly before writing this file, to match exact existing component names/props (`CircleButton`, `IconButton`, `ThemedText` variants, `Colors`/`Spacing` tokens) rather than inventing new ones:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscoveryFeed } from '@/components/player/discovery-feed';
import { PlayerBackground } from '@/components/player/player-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CircleButton, IconButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';
import { usePlayerStore } from '@/state/player-store';

const ON_COLOR_MEDIUM = 'rgba(255, 255, 255, 0.74)';

/**
 * Late Night Flow — full-screen vertical discovery player (approved Option A).
 * Opens from Home's Late Night Flow waveform. Swipe up/down to move through
 * the queue via `DiscoveryFeed`, which calls the SAME `swipeTo` Now Playing's
 * horizontal carousel already uses — one playback system, two presentations.
 * Closing (the back control, or the hardware/browser back gesture) returns to
 * Home; nothing here stops playback on close, so the mini-player keeps
 * whatever track was last playing, exactly like leaving Now Playing today.
 */
export default function DiscoverScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const track = usePlayerStore((s) => s.currentTrack());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const windowWidth = useContentWidth();
  const { height: windowHeight } = useWindowSize();
  const { t } = useAppStrings();

  if (trackId && trackId !== currentTrackId) {
    play(trackId);
  }

  if (!track) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <SafeAreaView style={styles.emptyState}>
          <ThemedText variant="headline-sm" emphasis="medium">
            {t('queueEmpty')}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const unavailable = playback === 'unavailable';

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PlayerBackground />
      </Animated.View>
      <DiscoveryFeed size={{ width: windowWidth, height: windowHeight }} />
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <IconButton variant="ghost" icon="close" iconSize={26} accessibilityLabel="Close" onPress={() => goBack()} />
        </View>
        <View style={styles.footer} pointerEvents="box-none">
          <View style={styles.titleBlock}>
            <ThemedText variant="headline-md" numberOfLines={1}>
              {track.title}
            </ThemedText>
            <ThemedText variant="label-lg" numberOfLines={1} style={styles.onColorMedium}>
              {track.artistName}
            </ThemedText>
          </View>
          <CircleButton
            icon={isPlaying ? 'pause' : 'play-arrow'}
            accessibilityLabel={unavailable ? 'Play (no audio in this preview)' : isPlaying ? 'Pause' : 'Play'}
            size={64}
            iconSize={32}
            disabled={unavailable}
            loading={playback === 'loading'}
            onPress={togglePlayPause}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onColorMedium: { color: ON_COLOR_MEDIUM },
  header: { height: 56, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.margin,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
});
```

Unused `router` import: remove it if nothing in the final file needs it (the close action uses `goBack()`, not direct `router` navigation) — included above only as a placeholder in case a "view artist"/options affordance is added; per the Global Constraint against decorative additions, leave it out unless you have a concrete reason, and delete the unused import if so.

- [ ] **Step 2: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 3: Isolated visual check**

Navigate directly to `/player/discover?trackId=<any real track id>` in the served build. Confirm: full-screen artwork/visualizer, title/artist, a working Play/Pause button, a working close button that returns to Home, and that `playback === 'unavailable'` tracks correctly disable Play rather than pretending to play (test with a track that has no demo audio, per `hasDemoAudio`).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/player/discover.tsx
git commit -m "feat: Late Night Flow discovery player route"
```

---

### Task 8: Desktop trackpad/mouse-wheel navigation (distinct from touch/mouse-drag)

`DiscoveryFeed`'s `Gesture.Pan()` (Task 6) already handles touch-drag on mobile AND click-and-drag with a mouse on desktop (RNGH's Pan gesture responds to both pointer types identically on web — the same way `ArtworkCarousel`'s existing horizontal drag already works with a mouse today). **Trackpad/mouse-wheel scrolling is a separate input entirely** — it fires as `wheel` events, not pointer-drag events, and critically, a physical trackpad swipe continues firing many small `wheel` events for a while after the user's finger lifts (inertial/momentum scrolling), which is exactly the failure mode the user explicitly warned about ("prevent accidental multiple skips caused by momentum scrolling"). This task adds that handling on top of Task 6/7's gesture-pan handling, web-only.

**Files:**
- Modify: `apps/mobile/src/components/player/discovery-feed.tsx`

**Interfaces:**
- Consumes: the same `swipeTo`, `canStep` already used by `DiscoveryFeed`.
- Produces: nothing new exported — internal wheel handling added to the existing component.

- [ ] **Step 1: Add debounced wheel handling**

In `apps/mobile/src/components/player/discovery-feed.tsx`, add a web-only `onWheel` handler to the component's root `Animated.View` (React Native Web passes DOM event props like `onWheel` through on `View`/`Animated.View` — confirm this directly by checking whether any existing component in this codebase already uses `onWheel` for a precedent pattern; if none exists, this is a new but standard RN-Web capability). The algorithm: track whether a "wheel gesture" is currently in progress with a `useRef` flag and a trailing-idle timer, so exactly one `swipeTo` fires per physical trackpad swipe, not one per wheel event:

```tsx
// Web-only: mouse-wheel / trackpad scroll, handled separately from the Pan
// gesture above (wheel events are not pointer-drag events). A physical
// trackpad swipe fires many small wheel events, including a long tail of
// inertial/momentum events after the finger lifts — so this locks after the
// FIRST wheel event that crosses the threshold, ignoring every subsequent
// wheel event until WHEEL_IDLE_MS has passed with no new events (meaning the
// physical gesture, including its momentum tail, has actually ended).
const WHEEL_THRESHOLD = 24;
const WHEEL_IDLE_MS = 220;
const wheelLocked = useRef(false);
const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleWheel = useCallback(
  (e: { deltaY: number; preventDefault?: () => void }) => {
    if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
    wheelIdleTimer.current = setTimeout(() => {
      wheelLocked.current = false;
    }, WHEEL_IDLE_MS);
    if (wheelLocked.current) return;
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
    const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
    const base = carouselTarget.value;
    if (!canStep(base, dir)) return;
    wheelLocked.current = true;
    const target = base + dir;
    carouselTarget.value = target;
    carouselPos.value = reduceMotion ? target : withSpring(target, CAROUSEL_SPRING);
    swipeTo(dir);
  },
  [reduceMotion, swipeTo],
);
```
Add `import { useCallback, useRef } from 'react';` to the existing import list. Wire `onWheel={handleWheel}` onto the outer `Animated.View` (the one currently wrapped by `GestureDetector`) — confirm this doesn't need to be on a different element by testing in Step 3; RN-Web generally forwards unrecognized DOM event props onto the underlying host element, but verify the event actually fires where you attach it.

Note the threshold (24) and idle window (220ms) are starting values appropriate to typical trackpad wheel-event deltas and momentum-scroll duration — if live testing in Step 3 shows these feel too sensitive (multiple skips still slip through) or too insensitive (a deliberate scroll doesn't register), adjust them and note the change in your report; this is a tuned UX value, not a hard requirement to hit exactly 24/220.

- [ ] **Step 2: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 3: Live trackpad/wheel verification**

Serve the build and test on `/player/discover` with an actual trackpad if available (or simulate via your browser automation tooling's wheel-event dispatch, firing a burst of 15-20 small `deltaY`-same-sign wheel events in quick succession to simulate one physical swipe plus its momentum tail): confirm exactly ONE track change happens per physical swipe gesture, not one per wheel event. Also test a plain mouse scroll-wheel (not a trackpad) — single discrete wheel "clicks" — and confirm each one still predictably moves one track (since there's no momentum tail to coalesce, the threshold/idle window should feel responsive, not sluggish — tune if needed). Separately confirm mouse click-and-drag (via the existing Pan gesture from Task 6) still works on desktop.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/player/discovery-feed.tsx
git commit -m "feat: debounced trackpad/wheel navigation for the discovery player"
```

---

### Task 9: Wire Home's Late Night Flow tap, verify no regression to existing player gestures

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/home/index.tsx`

**Interfaces:**
- Consumes: the new `/player/discover` route (Task 7).
- Produces: nothing new — this is the single integration point tying Task Group B together.

- [ ] **Step 1: Change exactly one line**

In `apps/mobile/src/app/(tabs)/home/index.tsx`, change line 119:
```tsx
onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: hero.id } })}
```
to:
```tsx
onPress={() => router.push({ pathname: '/player/discover', params: { trackId: hero.trackIds?.[0] ?? '' } })}
```
Leave `onPlayPress`, `onNextPress`, `onPreviousPress` (lines 117-127) completely untouched — they already control inline playback from the Home hero banner itself and are a separate, approved interaction this plan does not touch. Confirm `hero.trackIds` is non-empty before this change ships (the hero playlist is the one editorial playlist with real authored tracks per this plan's investigation) — if it's ever empty, falling back to the empty string would open the discover screen on no track; consider guarding with `hero.trackIds?.length ? router.push(...) : undefined` if you want to be defensive, though the existing `onPlayPress` handler already assumes `hero.trackIds` exists without a guard, so matching that existing level of defensiveness is acceptable too.

- [ ] **Step 2: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`
Expected: all pass.

- [ ] **Step 3: End-to-end live verification**

Serve the build. From Home: tap the Late Night Flow waveform (not the Play/Next/Previous buttons within the banner — confirm those still do what they did before, navigating nowhere / controlling inline playback as before) and confirm it opens `/player/discover` with the first hero track playing. Swipe up/down (touch-emulated and via mouse drag) through several tracks, confirm artwork/title/artist update and only one track plays at a time. Close via the back control and confirm you land back on Home with the mini-player (if visible) still reflecting whatever was last playing — i.e., playback state survived the close. Then, separately, open the regular Now Playing screen (e.g. via the mini-player) and verify ITS horizontal swipe-to-change-track and vertical swipe-to-collapse gestures still work exactly as before — this is the concrete proof that the new vertical gesture introduced no regression to the existing player.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/app/(tabs)/home/index.tsx"
git commit -m "feat: open the Late Night Flow discovery player from Home"
```

---

### Task 10: Full combined verification (both task groups) and iOS Safari autoplay check

**Files:** none modified — verification only.

- [ ] **Step 1: Full verification pass**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`
Expected: all pass, zero regressions from the full combined diff of both task groups.

- [ ] **Step 2: iOS Safari autoplay check**

The discovery player inherits `usePlayerStore`'s existing `playback: 'blocked'` state (already surfaced by the engine when a `play()` call is refused by the browser's autoplay policy) for free, since `discover.tsx` reads the same store the same way `now-playing.tsx` does. Confirm live (via the browser-automation tooling available in this session, emulating a mobile Safari user agent, or — if genuinely available — a real iPhone) that: opening the discovery player from a user-initiated tap (not a programmatic/background trigger) successfully starts audio (tap is a user gesture, so this should be the common case and should just work); and that if playback IS blocked for any reason, the UI shows a sensible state (disabled/loading Play button) rather than silently claiming to play nothing. **Do not claim physical iPhone Safari testing was performed unless it actually was** — if only emulated/headless testing was possible in this environment, say so plainly in the report.

- [ ] **Step 3: Full bilingual + discovery-player combined regression pass**

With Russian selected: confirm the discovery player's own UI (the Play/Pause button's accessibility label, the "nothing playing" empty state) is localized if Task Group A (Tasks 1-5)'s keys cover it — if `t('queueEmpty')` (reused in Task 7's empty state) and the Play/Pause accessibility labels aren't yet wired to `useAppStrings()` in `discover.tsx`, wire them now (a small addition to `discover.tsx`, in scope for this verification task since it's a one-or-two-line localization completion directly touching the new screen this plan introduced) — add `IconButton`'s "Close"/"Play"/"Pause" accessibility labels to `i18n.ts` if not already covered by an existing key (check `queueEmpty` already exists; a "Close" a11y label likely does not — add `closeLabel: 'Close'` / `'Закрыть'` if needed) and wire them.

- [ ] **Step 4: Compile the final report**

In the final report (not a new file), cover: confirmation TypeScript/lint/tests/build all pass on the full combined diff; the local preview URL; a summary of every screen checked in both languages; the discovery player's tested behaviors (tap-to-open, touch swipe, mouse drag, trackpad/wheel debouncing, continuous navigation, playback sync, close-preserves-state, autoplay handling and its testing limitation); explicit confirmation that `now-playing.tsx`'s existing gestures were re-tested and are unaffected; the full list of files touched across both task groups; and any overflow/layout fixes made in Task 5 Step 3.

- [ ] **Step 5: Do not commit this task** (verification-only, nothing to commit).

---

## AMENDMENT (2026-10-12): Two-Dimensional Discovery Navigation (Genres × Songs)

> Tasks 1-10 above are complete, reviewed, committed (`1068f4a`..`dce9b47`), and still stand. This amendment, requested by the user after reviewing the Task 10 preview, REPLACES the Group B discovery player's 1D (vertical-only) interaction model with a 2D one: **vertical swipe moves between songs within the current genre; horizontal swipe switches genre** (auto-selecting/restoring a track in the new genre). Everything else already shipped — localization, the route, the close/preserve-state behavior, the audio engine reuse — stays as-is.

**Spec (user's own request, verbatim-essential):** vertical UP/DOWN = next/prev song, genre unchanged; horizontal LEFT/RIGHT = next/prev genre, auto-selects and plays a valid track, updates label/artwork/background/visualizer; use existing genre/track data only, no invented tracks/genres; each genre has its own independent playback sequence, restoring the last selected track when returning to a genre; empty state (not fake playback) for a genre with no playable tracks; full-screen premium dark aesthetic unchanged, subtle current-genre label, no visual noise, Home's waveform unchanged; detect dominant gesture axis before committing — vertical never changes genre, horizontal never skips songs, one gesture = one action, handle trackpad momentum and mouse drag on both axes, preserve seek/other existing controls, support iPhone Safari/Android/desktop; reuse existing audio engine/store/queue/gesture utilities, no second audio player; preserve RU/EN localization including genre labels; test both axes independently and combined; do not commit/push/merge/deploy until visual approval.

**Follow-up UX clarification (user's own words, after reviewing the above), which SUPERSEDES the plain "empty state" framing wherever the two conflict:** horizontal navigation in the ACTIVE discovery player must include **only genres that currently contain at least one genuinely playable track** — do not show empty genres in the horizontal swipe sequence at all. All 12 genres remain available in the main Mmusic catalog (Browse All / genre-detail screens, untouched, out of scope). Vertical swipe = previous/next song within the current genre; horizontal swipe = previous/next AVAILABLE (i.e., playable) genre; restore the last selected track when returning to a previously visited genre; preserve the approved Particle Wave visual direction, the existing audio engine, RU/EN localization, and all previously approved UI; verify on both desktop and iPhone Safari.

### Data-model finding and the user's resolution

`Track`/`Album` have **no genre field** in the mock data model (`apps/mobile/src/mocks/types.ts`); only `Artist.genres?: string[]` (free-text tags: `Electronic`, `Ambient`, `Synthwave`, `Indie`, `Lo-Fi`, `Dream Pop`, `Neo-Classical`) exists, and none of these match the 12 catalog "Browse All" genre ids exactly. The existing genre detail screen (`search/genre/[id].tsx`) doesn't filter by genre at all today — it shows the same `tracks.slice(0,4)` regardless of which genre page is open. Presented this to the user with the exact artist/track breakdown; **the user chose a best-effort, fully-derived mapping from the existing `Artist.genres` tags to 4 of the 12 catalog genre ids** (not inventing new tracks or tags — purely filtering existing records), confirmed exactly as follows — this mapping is now a locked spec, not a task's own judgment call:

```
electronic-dance  → artist tag 'Electronic'   → solaris-echo, overcast-skies, kaelen, tate-vane, sable-duo (last has 0 tracks)
chill-lofi        → artist tags 'Ambient'+'Lo-Fi' → solaris-echo, elena-rostova, arlo, analog-dreamers
rock-indie        → artist tag 'Indie'        → clover-and-the-pulse (0 tracks today → empty state)
classical-film    → artist tag 'Neo-Classical'→ nils-frahm (0 tracks today → empty state)
all other 8 catalog genres (made-for-you, charts-viral, pop, hip-hop-rnb, jazz-soul,
deep-focus-ambient, workout-high-energy, fresh-finds) → no tag maps to them → empty state
```
Resulting real track sets (derived mechanically from `tracks.ts`'s existing `artistId` field, not hand-picked):
- `electronic-dance` (8 tracks): `midnight-mirage`, `horizon`, `obsidian-frequencies`, `ember-tide`, `resonant-field-reprise`, `vapor-trails`, `nebula-dreams-t1`, `chronos-echoes-t1`
- `chill-lofi` (9 tracks): `midnight-mirage`, `horizon`, `obsidian-frequencies`, `ember-tide`, `resonant-field-reprise`, `abyssal-bloom`, `abyssal-bloom-feat`, `lost-frequencies-t1`, `tape-saturation-4`
- Every other genre (including `rock-indie`/`classical-film`, which map but currently have 0 tracks): 0 tracks

`maya-lin` (`Synthwave`) and `yuki-tanaka` (`Dream Pop`) are intentionally left unmapped per the confirmed table — their one track (`velvet-skyline-t1`) stays reachable elsewhere in the app (Search/Library) but not through this genre-discovery feature. Do not "fix" this by stretching the mapping further; it was shown to and approved by the user exactly as listed.

**Follow-up clarification's effect on this list:** per the user's follow-up ("do not show empty genres in the horizontal swipe sequence"), the discovery player's ACTIVE horizontal genre list is the above filtered down to only genres with ≥1 track — currently exactly **`['electronic-dance', 'chill-lofi']`**, in that catalog order (positions 5 and 8 of the existing 12-entry `genres` array). This is computed by a filter function, not hand-typed as a literal 2-entry list, so it recomputes correctly if the mock catalog ever grows (e.g., if `clover-and-the-pulse`/`nils-frahm`/`sable-duo` ever get tracks, `rock-indie`/`classical-film` would then join the active list automatically). **This removes the need for any genre-level empty state inside the discovery player itself** — every genre reachable by horizontal swipe is, by construction, non-empty. The 12-genre Browse-All catalog screens are untouched and still show/link to all 12 genres, including the ones not reachable from the discovery player.

### New Global Constraints (additive to the original ones above)

- The discovery player's horizontal genre list = `genres` (from `@/mocks`, existing catalog order) **filtered to only genre ids with ≥1 real track** under the locked mapping — currently `['electronic-dance', 'chill-lofi']`, computed via a filter function, never hand-typed as a literal list. Horizontal navigation clamps at both ends of THIS filtered list (no wrap) — same non-wrapping convention the vertical song carousel already uses. The full, unfiltered 12-genre catalog (Browse All / genre-detail screens) is untouched and out of scope.
- The genre↔track mapping above is locked spec, copied verbatim into the implementation — no task may extend or adjust it without a new ruling.
- `carouselPos`/`carouselTarget` (`@/state/player-surface`) are NOT reused for the genre axis — they remain exactly what they were (vertical song-within-queue position, shared with `ArtworkCarousel`/Now Playing). The genre axis gets its own, new, separate shared-value pair.
- "Restore the last selected track" is scoped to the current discovery-player session (in-memory, not persisted to disk/localStorage) — closing the app or the discovery screen entirely and reopening it later is not required to remember prior genre positions. (If the user wants cross-session persistence, that is a follow-up, not part of this amendment — flag if raised.)
- Because the horizontal list is pre-filtered to playable genres only, the discovery player itself should never need to render a genre-level empty state in normal operation. Still add one defensive fallback (pause, don't fake-play, if `getTrackIdsForGenre` is ever somehow called with a genre that turns out empty) so a filter-function bug fails safely instead of pretending to play — but this is a safety net, not a designed-for UI path, and should not need its own dedicated empty-state screen/copy.

### Review Focus (new, for this amendment)

1. **Axis purity under real-world sloppy input** — a diagonal drag (neither purely vertical nor horizontal) must commit to exactly one axis and never do both; a reviewer should specifically try drags at ~30-60° angles, not just clean horizontal/vertical ones.
2. **Stale closure / stale read bugs in the genre-switch effect** — this plan already hit exactly this class of bug once (Task 9's `currentTrackId`-read-after-`play()` bug); the new genre-switch effect reads/writes both the player store and the new discovery store and must be checked the same way.
3. **The filtered genre list must be provably correct, not just assumed from the locked mapping** — a reviewer should independently confirm, by inspection or a quick script, that the ACTUAL filtered list the running app uses is exactly `['electronic-dance', 'chill-lofi']` (or whatever it mechanically computes to), and that swiping horizontally never lands on a genre with zero tracks, not even transiently (e.g. a one-frame flash before a redirect-away).
4. **Wheel-axis arbitration reusing the same lock/idle mechanism for two axes** — a reviewer should verify a diagonal/ambiguous wheel burst (both deltaX and deltaY present) still resolves to exactly one axis and one action, not a double-fire.
5. **`carouselPos`/`carouselTarget` must be provably untouched in meaning** — Now Playing's `ArtworkCarousel` reads these same globals; re-verify (as Task 9 already did once) that nothing about adding a second, independent genre-axis shared-value pair changes vertical-song behavior on Now Playing.

---

### Task 11: Genre-track derivation + non-persisted discovery store

**Files:**
- Create: `apps/mobile/src/lib/genre-tracks.ts`
- Create: `apps/mobile/src/state/discovery-store.ts`
- Create: `apps/mobile/src/state/discovery-surface.ts`
- Test: a new test file alongside the existing test convention (check `apps/mobile` for its test runner's existing location pattern, e.g. co-located `*.test.ts` or a `tests/` folder — match whatever Task 1-10's own test files already used)

**Interfaces:**
- Produces: `export function getTrackIdsForGenre(genreId: string): TrackId[]` (pure function, no React/store dependency); `export function getPlayableGenreIds(): string[]` (pure function — the full catalog `genres` list filtered to ids with ≥1 track, in catalog order; this is THE source of the discovery player's horizontal list per the user's follow-up constraint); `export function getGenreIdForTrack(trackId: TrackId): string | undefined` (which playable genre, if any, a track belongs to); `export const GENRE_TAG_MAP: Record<string, string[]>` (the locked mapping above, as literal data — not inferred/computed); `discovery-store.ts`'s `useDiscoveryStore` with state `{ genreIds: string[], genreIndex: number, lastTrackByGenre: Record<string, TrackId> }` and actions `{ setGenreIndex: (i: number) => void, setGenreById: (genreId: string) => void, recordLastTrack: (genreId: string, trackId: TrackId) => void }` (`setGenreById` is the convenience Task 14 calls on mount — it looks up the id's position in `genreIds` and delegates to `setGenreIndex`, falling back to index `0` if the id isn't found in the current playable list); `discovery-surface.ts`'s `export const genrePos = makeMutable(0)`, `export const genreTarget = makeMutable(0)`, `export function canStepGenre(base: number, dir: 1 | -1, count: number): boolean` (worklet, clamp semantics, no wrap, no repeat-all).
- Consumes: `artists`, `tracks`, `genres` from `@/mocks` (read their current exports — this plan's investigation already confirmed `Artist.genres: string[]`, `Track.artistId`, and the `genres: Genre[]` array's shape, but re-confirm exact export names/paths from `@/mocks`'s own index before writing).

- [ ] **Step 1: Implement `getTrackIdsForGenre` and `getPlayableGenreIds`**

```ts
// apps/mobile/src/lib/genre-tracks.ts
import { artists, genres, tracks } from '@/mocks';
import type { TrackId } from '@/mocks';

/**
 * Maps catalog genre ids (the 12 "Browse All" categories) to the existing
 * Artist.genres free-text tags that belong to them. This is a locked,
 * user-approved mapping (see the plan's AMENDMENT section) — do not extend
 * or guess additional entries. A genre id with no entry here, or whose
 * mapped artists have no tracks, correctly has zero tracks.
 */
export const GENRE_TAG_MAP: Record<string, string[]> = {
  'electronic-dance': ['Electronic'],
  'chill-lofi': ['Ambient', 'Lo-Fi'],
  'rock-indie': ['Indie'],
  'classical-film': ['Neo-Classical'],
};

export function getTrackIdsForGenre(genreId: string): TrackId[] {
  const tags = GENRE_TAG_MAP[genreId];
  if (!tags || tags.length === 0) return [];
  const artistIds = new Set(artists.filter((a) => a.genres?.some((g) => tags.includes(g))).map((a) => a.id));
  return tracks.filter((t) => artistIds.has(t.artistId)).map((t) => t.id);
}

/**
 * The discovery player's horizontal genre list, per the user's explicit
 * follow-up constraint: only genres with at least one real track are
 * reachable by horizontal swipe — do not show empty genres in that
 * sequence. The full 12-genre catalog (Browse All / genre-detail screens)
 * is untouched and keeps showing all 12 regardless of this filter.
 */
export function getPlayableGenreIds(): string[] {
  return genres.map((g) => g.id).filter((id) => getTrackIdsForGenre(id).length > 0);
}

/** Which playable genre (if any) a given track belongs to — used to pick the
 * right starting genre when the discovery player opens on a specific track
 * (e.g. from Home) that may or may not be tagged into the current mapping. */
export function getGenreIdForTrack(trackId: TrackId): string | undefined {
  return getPlayableGenreIds().find((id) => getTrackIdsForGenre(id).includes(trackId));
}
```
Verify `getPlayableGenreIds()` currently returns exactly `['electronic-dance', 'chill-lofi']` in that order, and that `getTrackIdsForGenre` for the two non-empty genres resolves to exactly the 8/9-track lists given in the AMENDMENT section above.

- [ ] **Step 2: Implement the discovery store and surface values**

```ts
// apps/mobile/src/state/discovery-store.ts
import { create } from 'zustand';
import type { TrackId } from '@/mocks';
import { getPlayableGenreIds } from '@/lib/genre-tracks';

type DiscoveryState = {
  genreIds: string[];
  genreIndex: number;
  lastTrackByGenre: Record<string, TrackId>;
  setGenreIndex: (i: number) => void;
  setGenreById: (genreId: string) => void;
  recordLastTrack: (genreId: string, trackId: TrackId) => void;
};

// Deliberately NOT wrapped in zustand/persist — this is in-memory, scoped to
// the current discovery session, per the plan's amendment constraint.
export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  genreIds: getPlayableGenreIds(),
  genreIndex: 0,
  lastTrackByGenre: {},
  setGenreIndex: (i) => set({ genreIndex: i }),
  setGenreById: (genreId) => {
    const idx = get().genreIds.indexOf(genreId);
    set({ genreIndex: idx >= 0 ? idx : 0 });
  },
  recordLastTrack: (genreId, trackId) => set((s) => ({ lastTrackByGenre: { ...s.lastTrackByGenre, [genreId]: trackId } })),
}));
```
Task 14 calls `setGenreById(getGenreIdForTrack(trackId) ?? genreIds[0])` once, on mount, to pick the correct starting genre for whatever track the discovery player opened on (e.g. from Home) — see Task 14 Step 1 for the exact call site.
```ts
// apps/mobile/src/state/discovery-surface.ts
import { makeMutable } from 'react-native-reanimated';

/** Horizontal genre-axis position, mirroring player-surface.ts's carouselPos
 * but entirely separate — genres are not part of the global player queue. */
export const genrePos = makeMutable(0);
export const genreTarget = makeMutable(0);

/** Clamp semantics only (no wrap, no repeat-all — genres aren't a play queue). */
export function canStepGenre(base: number, dir: 1 | -1, count: number): boolean {
  'worklet';
  const index = Math.round(base);
  return dir > 0 ? index < count - 1 : index > 0;
}
```

- [ ] **Step 3: Tests**

Write unit tests for `getTrackIdsForGenre` covering: `electronic-dance` returns exactly the 8 listed ids (order not required to match exactly, but set-equality must); `chill-lofi` returns exactly the 9 listed ids; at least 2 of the 8 empty-mapped genre ids (e.g. `pop`, `made-for-you`) return `[]`; an unknown/garbage genre id returns `[]` without throwing.

- [ ] **Step 4: Typecheck, lint, test**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/genre-tracks.ts apps/mobile/src/state/discovery-store.ts apps/mobile/src/state/discovery-surface.ts <new test file(s)>
git commit -m "feat: genre-track derivation and discovery-session store for 2D discovery nav"
```

---

### Task 12: 2D Pan-gesture rework of `DiscoveryFeed` — dominant-axis detection, horizontal genre carousel

**Files:**
- Modify: `apps/mobile/src/components/player/discovery-feed.tsx`

**Interfaces:**
- Consumes: Task 11's `useDiscoveryStore`, `genrePos`/`genreTarget`/`canStepGenre`, `getTrackIdsForGenre`; unchanged `carouselPos`/`carouselTarget`/`canStep`/`CAROUSEL_SPRING`/`REDUCED_SETTLE_MS`/`usePlayPosition` from `@/state/player-surface`; unchanged `resolveSwipe`/`rubberBand` from `@/lib/gesture-math` (reused for BOTH axes, axis-agnostic as already established).
- Produces: `DiscoveryFeed` now renders a 2-level nested structure (outer horizontal genre strip, inner vertical song strip for only the currently-centered genre); on a horizontal gesture commit, it calls `useDiscoveryStore.getState().setGenreIndex(newIndex)` directly (no new prop/callback — same "import the global store directly" convention this component already uses for `usePlayerStore`'s `swipeTo`).

- [ ] **Step 1: Remove the old 1D-only gesture constraints**

Read the CURRENT `discovery-feed.tsx` in full (it has evolved through 3 commits since Task 6 — do not work from the plan's earlier Task 6 listing, which is now stale). Remove `.activeOffsetY([-DISCOVERY_ACTIVE_OFFSET_Y, DISCOVERY_ACTIVE_OFFSET_Y])` and `.failOffsetX([-DISCOVERY_FAIL_OFFSET_X, DISCOVERY_FAIL_OFFSET_X])` from the `Gesture.Pan()` builder — these forced vertical-only activation and killed horizontal movement outright, which is exactly backwards for the new 2D requirement. `DISCOVERY_ACTIVE_OFFSET_Y`/`DISCOVERY_FAIL_OFFSET_X` (in `gesture-math.ts`) become unused by this file; leave them defined (do not delete) in case `gesture-math.ts` doesn't have other consumers checked — but if `expo lint`/`tsc` flags them as unused exports, that's fine (exports aren't flagged as unused the way local variables are).

- [ ] **Step 2: Add symmetric activation + axis-lock state**

```ts
.activeOffsetX([-12, 12])
.activeOffsetY([-12, 12])
```
Add a new shared value to track which axis this gesture has committed to, reset at the start of every gesture:
```ts
const lockedAxis = useSharedValue<'x' | 'y' | null>(null);
```

- [ ] **Step 3: Axis-dominance detection + dual-axis routing in `onUpdate`/`onEnd`**

In `onStart`: reset `lockedAxis.value = null`, cancel both `carouselPos` and `genrePos` animations, record both `dragStart` values (you'll need a second drag-start shared value for the genre axis, e.g. `genreDragStart`).

In `onUpdate`, on the FIRST update where `lockedAxis.value === null` AND the gesture has moved past a small deadzone (e.g. `Math.abs(e.translationX) + Math.abs(e.translationY) > 4`), decide: `lockedAxis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? 'x' : 'y';`. Below the deadzone, do nothing yet (don't move either axis) — this avoids a coin-flip lock on a near-zero first sample. Once `lockedAxis.value` is set for this gesture, every subsequent `onUpdate` call routes ENTIRELY to that axis's existing math (vertical: the current `carouselPos`/`carouselTarget`/`canStep`/`rubberBand` block, completely unchanged in its own logic; horizontal: the mirror of that same block using `genrePos`/`genreTarget`/`canStepGenre(..., discoveryStore.genreIds.length)`/`rubberBand`) — the OTHER axis's shared value is not touched at all while a gesture is locked to one axis. This is what makes "vertical gestures must never accidentally change genres" structurally true: the genre axis literally never receives a write unless `lockedAxis.value === 'x'`.

In `onEnd`: branch on `lockedAxis.value`. `'y'` branch is the EXACT existing logic (resolve via `resolveSwipe`/`rubberBand` on `translationY`/`velocityY`, animate `carouselPos`, `scheduleOnRN(swipeTo, dir)`) — do not change its behavior. `'x'` branch mirrors it on `translationX`/`velocityX`/`step = size.width`, animates `genrePos`/`genreTarget`, and on a nonzero `dir`, calls `scheduleOnRN(commitGenreChange, dir)` where `commitGenreChange` is a new plain JS function (defined in this component, not a worklet) that: reads `useDiscoveryStore.getState()`, computes the new index (clamped, matching `canStepGenre`'s own bounds so the two can never disagree), calls `setGenreIndex(newIndex)`. If `lockedAxis.value === null` (gesture never exceeded the deadzone — a tap or a negligible jitter), do nothing on either axis.

- [ ] **Step 4: Render the 2-level nested structure**

Restructure the component's return value: an outer `Animated.View` sized to `size`, with `overflow: hidden`, whose inner translateX is driven by `genrePos.value * size.width`, containing 3 `GenreSlot`s at genre-relative positions `{ -1, 0, +1 }` (prev/current/next genre by `useDiscoveryStore`'s `genreIndex`, drawn from the ALREADY-FILTERED `genreIds` list — every index in that list is guaranteed non-empty per Task 11's `getPlayableGenreIds`, so no empty-genre rendering case exists at this layer at all). Each `GenreSlot` for a NON-current genre renders a lightweight static preview only (that genre's first track's static `Artwork` — do not mount a full vertical song-carousel for a genre that isn't centered, mirroring the existing "only the current slide gets the expensive content" performance rule). The CURRENT `GenreSlot` renders the EXISTING vertical 3-slot song structure (prev/current/next SONG, via `carouselPos`, exactly as this component already does today) — unconditionally, since the current genre is always non-empty by construction. (A defensive `trackIds.length === 0` guard rendering nothing/a minimal fallback is fine to add for safety, but it should never be reachable in normal operation — don't design a real empty-state UI around it; see the amendment's Global Constraints.)

- [ ] **Step 5: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`

- [ ] **Step 6: Live axis-purity verification**

Serve the build. On `/player/discover`, test: a clean vertical drag (song changes, genre label — if visible from Task 14's work, otherwise just confirm via console/state inspection — stays the same); a clean horizontal drag (genre changes, current song resets to that genre's first-or-restored track); a ~45° diagonal drag (must commit to exactly ONE axis's action, never both, never neither when the deadzone is cleared); a drag that doesn't clear the deadzone (a tap/jiggle — nothing should move on either axis).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/player/discovery-feed.tsx
git commit -m "feat: 2D dominant-axis Pan gesture for DiscoveryFeed (vertical songs, horizontal genres)"
```

---

### Task 13: 2D wheel/trackpad rework — axis arbitration for `handleWheel`

**Files:**
- Modify: `apps/mobile/src/components/player/discovery-feed.tsx`

**Interfaces:**
- Consumes: Task 12's `lockedAxis` pattern (mirrored, not reused directly — `handleWheel` is a plain JS callback, not a worklet, so it needs its own `useRef`-based axis lock, analogous in shape but a separate mechanism since it can't share a Reanimated shared value with a non-worklet callback without extra plumbing that isn't worth it here).
- Produces: `handleWheel` now reads both `e.deltaX` and `e.deltaY`.

- [ ] **Step 1: Extend the existing debounce lock to also pick an axis**

Read the CURRENT `handleWheel` in `discovery-feed.tsx` (Task 8's shipped version) in full before editing. Add a second ref, `wheelAxisRef = useRef<'x' | 'y' | null>(null)`. On the first wheel event of a new (unlocked) gesture — i.e., the branch that currently does `if (wheelLocked.current) return;` — before checking the threshold, decide the axis: `const axis = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'x' : 'y'; wheelAxisRef.current = axis;`. Then check the THAT axis's delta against `WHEEL_THRESHOLD` (not always `deltaY`) — if below threshold, return without locking (same as today). Once locked, route the commit (`carouselTarget`/`carouselPos`/`swipeTo` for `'y'`, `genreTarget`/`genrePos`/the Task 12 `commitGenreChange` helper for `'x'`) based on `wheelAxisRef.current`, and keep using it for the WHOLE locked period (ignore the other axis's delta on every event until `WHEEL_IDLE_MS` unlocks, exactly like Task 8's existing single-axis unlock timer — no new timer needed, the SAME `wheelIdleTimer`/`wheelLocked` pair governs both axes now, `wheelAxisRef` just says which one is active for this locked window).

- [ ] **Step 2: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`

- [ ] **Step 3: Live verification — both wheel axes, plus a diagonal burst**

Simulate (or use real trackpad input if available): a vertical-only wheel burst (song changes, genre unchanged — confirm no genre-axis write happened); a horizontal-only wheel burst (genre changes); a burst with BOTH non-trivial deltaX and deltaY on its first event (must resolve to exactly one axis, the larger of the two, and commit only that one action).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/player/discovery-feed.tsx
git commit -m "feat: axis arbitration for trackpad/wheel navigation (vertical songs, horizontal genres)"
```

---

### Task 14: Genre-switch side effects, mount-time genre resolution, genre label, and localization

**Files:**
- Modify: `apps/mobile/src/app/player/discover.tsx` (mount-time genre resolution, the genre-change side effect, genre label UI)
- Modify: `apps/mobile/src/lib/i18n.ts` (new keys)

**Interfaces:**
- Consumes: Task 11's `useDiscoveryStore`, `getTrackIdsForGenre`, `getGenreIdForTrack`; Task 12/13's gesture work (this task reacts to `genreIndex` changes, it doesn't touch gesture code).
- Produces: nothing new exported — wires everything already built into visible, correct, localized behavior. No empty-state UI is built in this task — the filtered genre list (Task 11) already guarantees every reachable genre is non-empty, so there is no empty-genre screen to design.

- [ ] **Step 1: Mount-time genre resolution + the genre-change side effect**

`discover.tsx` currently seeds playback from its `trackId` URL param without knowing which (if any) of the two playable genres that track belongs to — e.g. opening from Home's Late Night Flow banner can land on a track that's in BOTH playable genres, in only one, or (for `velvet-skyline-t1`, intentionally unmapped per the AMENDMENT) in NEITHER. Add, once on mount:
```ts
useEffect(() => {
  const resolvedGenreId = (trackId && getGenreIdForTrack(trackId)) || genreIds[0];
  setGenreById(resolvedGenreId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
(`genreIds`/`setGenreById` from `useDiscoveryStore`; run this BEFORE or independently of the existing `trackId !== currentTrackId` effect — if the resolved genre doesn't actually contain the requested `trackId` [the `velvet-skyline-t1` case], the genre-change effect below will immediately reseed playback to that genre's own first-or-restored track instead, which is correct: the discovery player can only ever play tracks from its two playable genres, matching the user's "do not show empty genres" constraint by extension — a track outside the mapping isn't a reachable discovery-player state either.)

Then add the main genre-change effect, keyed on `useDiscoveryStore`'s `genreIndex`:
```ts
useEffect(() => {
  const genreId = genreIds[genreIndex];
  const trackIds = getTrackIdsForGenre(genreId);
  const restored = lastTrackByGenre[genreId];
  const targetTrackId = restored && trackIds.includes(restored) ? restored : trackIds[0];
  if (targetTrackId) play(targetTrackId, trackIds);
  // Defensive only — getPlayableGenreIds() guarantees trackIds.length > 0 for
  // every id in genreIds, so the `!targetTrackId` case should be unreachable;
  // if it ever fires, pause() rather than leaving a stale track's UI up.
  else pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [genreIndex]);
```
**Watch for the exact stale-closure class of bug this plan already hit once (Task 9):** read every value this effect needs (`lastTrackByGenre`, `trackIds`, etc.) BEFORE calling `play()`/`pause()`, never re-read a selector's value from the same render pass after a store-mutating call expecting it to reflect the mutation — compute locally, use the local value everywhere in the effect.

Separately, add a SECOND `useEffect` that calls `recordLastTrack(genreId, currentTrackId)` whenever `currentTrackId` changes WHILE the current genre is active (so vertical swipes within a genre update that genre's "last track" too, not just the track you first landed on) — guard against recording a track that doesn't belong to `trackIds` (shouldn't happen, but don't trust it blindly).

- [ ] **Step 2: Genre label UI**

Add a small, subtle text element (per the Global Constraint: "clearly but subtly", "avoid unnecessary visual noise") showing the current genre's localized name — somewhere in the header area near the close button, not competing with the track title/artist in the footer. Add i18n keys for ONLY the genres this feature can actually reach today (`genreNameElectronicDance`/`genreNameChillLofi` at minimum — EN values are each genre's existing `title` field verbatim, `'Electronic & Dance'`/`'Chill & Lo-Fi'`, RU values are new natural translations), but implement the lookup generically (e.g. a small `Record<string, AppStringKey>` map keyed by genre id) so it doesn't silently misrender if `getPlayableGenreIds()` ever grows to include a third genre later — judge whether it's worth adding all 12 keys now for future-proofing or just the 2 reachable today; either is acceptable, note which you chose in your report. **Note:** the pre-existing Browse-All genre screens (`search/all-genres.tsx`, `search/genre/[id].tsx`) intentionally keep rendering raw, untranslated `genre.title` — that is pre-existing, already-reviewed, out-of-scope behavior; do NOT go change those screens to use these new keys, this task's new keys are for the discovery player only.

- [ ] **Step 3: Typecheck, lint, test, build**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`

- [ ] **Step 4: Live verification**

Serve the build. Confirm: opening the discovery player from Home lands on the correct genre for the entry track; horizontal swipe between `electronic-dance` and `chill-lofi` auto-plays a real track from each, with the genre label updating; horizontal swipe NEVER reaches a third genre (only these two exist in the filtered list — confirm by trying to swipe past both ends, should clamp, not wrap into emptiness); swipe back to a genre you've already changed tracks within — confirm it restores the LAST track you were on in that genre, not always its first track; switch locale to Russian and re-check the genre label renders naturally.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/src/app/player/discover.tsx" apps/mobile/src/lib/i18n.ts
git commit -m "feat: genre-switch playback wiring, mount-time genre resolution, and genre-label localization"
```

---

### Task 15: Full combined verification of the 2D discovery navigation

**Files:** none modified — verification only.

- [ ] **Step 1: Full verification pass**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo lint && npm test && npm run build:web`

- [ ] **Step 2: Independent-axis + combined live verification**

Serve the fresh build. Test, and report each explicitly:
- Vertical-only: several up/down swipes within `electronic-dance` (then within `chill-lofi`), confirm genre never changes, song advances/retreats correctly, playback stays in sync.
- Horizontal-only: several left/right swipes — confirm the sequence is EXACTLY `electronic-dance ⇄ chill-lofi`, clamping at both ends (no wrap, and critically no third genre, no empty genre, ever reachable); label/artwork/background/visualizer all update together on each genre change; independently verify (by inspection or a quick script, per Review Focus item 3) that `getPlayableGenreIds()` really does return exactly these two ids and nothing else in the current build.
- Combined sequences: vertical then horizontal then vertical again, confirm the vertical position within the NEW genre starts correctly (first track, or restored track if revisited) and does not carry over the previous genre's song index.
- Axis-purity stress test: several deliberately diagonal (~30-60°) drags — each must resolve to exactly one axis's action.
- Mouse click-and-drag on desktop, both axes.
- Simulated/real trackpad momentum burst, both axes, including one deliberately ambiguous (diagonal) burst.
- Re-check existing, unrelated gestures are unaffected: Now Playing's own horizontal (song) and vertical (collapse) gestures (re-verify once more, same as Task 9/10 already did, since this task touched the shared `carouselPos`/`carouselTarget` globals' CONSUMERS, even though it added a separate new pair for genres).
- RU/EN: genre label text in both languages, instant switch, persistence.
- Seek bar and other existing player controls (if reachable from this screen or Now Playing) still work — the amendment's spec explicitly requires "preserve playback progress seeking and other existing player controls."
- **Desktop AND iPhone Safari**, per the user's explicit follow-up request: do the above on a desktop browser, then separately confirm on an emulated/real iPhone Safari context — touch-drag both axes, confirm no iOS-specific scroll-hijacking or rubber-band-of-the-page interferes with the gesture, and be explicit in the report about which parts were genuinely tested on real iOS Safari vs. emulated (do not claim real-device testing unless it actually happened, same discipline as Task 10).

- [ ] **Step 3: Compile the final report**

Cover: pass/fail on every item in Step 2; confirmation that the discovery player's horizontal list is exactly `['electronic-dance', 'chill-lofi']` (or whatever it mechanically computes to, if the catalog changed) and never includes an empty genre; any deviations/rulings made during Tasks 11-14; the local preview URL; full file list for Tasks 11-14's combined diff; explicit desktop-vs-iPhone-Safari-vs-emulated breakdown of what was tested where.

- [ ] **Step 4: Do not commit this task** (verification-only).

---

## Final Report

Present the Task 10 Step 4 writeup AND the Task 15 Step 3 writeup together to the user as one combined final report, along with the local preview URL. Per the user's explicit instruction, do not commit beyond what each task step already committed locally, and do not push, merge, or deploy anything — wait for visual and functional approval before any further action.
