# Demo Screenshot Inventory Implementation Plan

> **STATUS: WITHDRAWN FROM EXECUTION SCOPE (2026-10-12).** The user will share the live Mmusic site and Stitch designs with management directly, so this plan is not being implemented. Kept for reference only — do not execute any task below without a new, separate approval from the user.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture a full-page desktop and mobile screenshot of every one of Mmusic's 38 screens/dev-routes, saved to a separate `Mmusic-Demo-Screenshots/` folder, for the management demo.

**Architecture:** No app code changes. Runs against the Metro dev server (`expo start --web`), not the static export — this keeps dev-only routes reachable (including the demo-seed screen from the dashboard plan) and skips an extra export/serve step. Uses this session's already-available browser-automation MCP tools (Playwright MCP, already loaded) rather than installing a new dependency. A single script drives the browser through every route in dependency order, applying the small amount of setup each state-dependent screen needs, screenshotting at two viewport sizes per screen.

**Tech Stack:** Node.js script using this session's Playwright MCP tools (no new npm dependency added to the project).

**Spec:** `docs/superpowers/specs/2026-10-12-mmusic-demo-prep-design.md`

## Global Constraints

- Depends on the Artist Dashboard plan (`2026-10-12-artist-dashboard-demo-seed.md`) having been run first, so the dashboard screens have real content to capture — Task 2's walkthrough assumes that state already exists.
- Capture happens against the **dev server**, not `apps/mobile/dist` — the static export strips dev-only routes (`scripts/web-postexport.mjs`) and this demo relies on `/dev-demo-seed` already having been visited once (its effect persists in the dev server's in-memory state for the session, not across reloads — see Task 2's ordering note).
- Known visual bugs (e.g. the Discover screen's title/track-name mismatch noted in project memory) are captured as-is. This plan does not fix them.
- Output goes to `Mmusic-Demo-Screenshots/{desktop,mobile}/` at the repo root (per the user's explicit instruction for "a separate Mmusic-Demo-Screenshots folder"). This plan adds it to `.gitignore` since it's a generated demo artifact, not source — flag to the user if they'd prefer it committed or placed under `docs/` instead.

## Review Focus

- A screen requiring app state (liked track, active playback, a search query, a completed donation, a published artist track) screenshotted cold (fresh page load, no setup) would show an empty/default state instead of the intended demo content — Task 2's walkthrough sequence sets up each such state before its screenshot, in dependency order.
- A screenshot taken while a route is still animating/transitioning (e.g. right after `router.push`) could capture a half-rendered frame — Task 2 waits for a stable selector or a fixed settle delay after each navigation before capturing.
- Capturing a sheet/modal route (e.g. `sheets/support-confirm`) by navigating to it directly, rather than opening it as a sheet over its parent screen, would show it full-screen instead of as the designed overlay — Task 2 notes which routes are sheets and opens them via their real trigger (e.g. tapping "Donate"), not by direct URL navigation, wherever the sheet's own screen expects a parent route param.
- Running the script twice without clearing the previous run's files could silently mix an old screenshot with a new one if a route is renamed/removed between runs — Task 1's script clears the output folder at the start of each run.
- The desktop (1440×900) and mobile (390×844) viewports must both be captured for every screen, not just the one the operator happens to test first — Task 1's route table has an explicit column for both, and Task 3 verifies file counts match `2 × screen count`.

---

## Route inventory (38 screens/dev-routes, from the repo audit)

| Area | Routes | Needs setup before capture? |
|---|---|---|
| Home | `/home`, `/home/see-all` | No |
| Library | `/library`, `/library/liked-songs` | `liked-songs` needs ≥1 liked track |
| Search | `/search`, `/search/all-genres`, `/search/genre/[id]`, `/search/results` | `results` needs a submitted query |
| Player | `/player/discover`, `/player/lyrics`, `/player/now-playing`, `/player/queue` | All need active playback |
| Profile/Settings | `/profile`, `/profile/account`, `/profile/audio-quality`, `/profile/downloads`, `/profile/settings`, `/profile/settings-language`, `/profile/support-history` | `support-history` needs ≥1 donation |
| Artist onboarding | `/profile/artist/become-artist`, `/profile/artist/setup`, `/profile/artist/upload-track` | No (these ARE the setup flow) |
| Artist Dashboard | `/profile/artist/dashboard`, `.../analytics`, `.../promotion`, `.../studio-pro` | Needs the dashboard-demo-seed plan's Task 3 walkthrough completed first |
| Sheets | `add-to-playlist`, `demo-audio`, `notifications`, `options`, `support-confirm`, `support-success`, `support` | Open via their real trigger, not direct URL, where the sheet expects a parent context |
| Content detail | `/album/[id]`, `/artist/[id]`, `/playlist/[id]`, `/track/[id]`, `/create-playlist` | Pick one real existing id for each (e.g. `horizon-deluxe`, `solaris-echo`, an existing playlist id, `midnight-mirage`) |
| Dev-only | `/dev-living-moods`, `/dev-ui-kit`, `/dev-demo-seed` | No (only reachable in dev mode, by design) |

## Task 1: Write the screenshot capture script

**Files:**
- Create: `scripts/demo-screenshots/capture.mjs`
- Create: `scripts/demo-screenshots/routes.json`
- Test: `scripts/demo-screenshots/__tests__/routes.test.mjs` (new) — validates the route manifest, not the browser automation itself (that's verified manually in Task 2/3, since it drives a live browser session via MCP tools this test harness can't invoke).

**Interfaces:**
- Consumes: nothing from the app's own source — reads only its own `routes.json` manifest.
- Produces: `Mmusic-Demo-Screenshots/{desktop,mobile}/<screen-id-or-route-slug>.png`, and a `manifest.json` summary (route → captured file paths) that Task 3 checks against.

- [ ] **Step 1: Write the failing test for the route manifest**

```javascript
// scripts/demo-screenshots/__tests__/routes.test.mjs
import { describe, it, expect } from '@jest/globals';
import routes from '../routes.json' assert { type: 'json' };

describe('demo screenshot route manifest', () => {
  it('has exactly 38 routes', () => {
    expect(routes.length).toBe(38);
  });

  it('every route has a unique output slug', () => {
    const slugs = routes.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every route has a path starting with /', () => {
    for (const route of routes) {
      expect(route.path.startsWith('/')).toBe(true);
    }
  });

  it('every route marked needsSetup has a non-empty setup description', () => {
    for (const route of routes.filter((r) => r.needsSetup)) {
      expect(typeof route.setup).toBe('string');
      expect(route.setup.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/kalemaimasheva/Desktop/Mmusic app" && npx jest scripts/demo-screenshots/__tests__/routes.test.mjs`
Expected: FAIL — `routes.json` does not exist.

- [ ] **Step 3: Write `routes.json`**

```json
[
  { "slug": "s01-home", "path": "/home", "needsSetup": false, "setup": "" },
  { "slug": "home-see-all", "path": "/home/see-all", "needsSetup": false, "setup": "" },
  { "slug": "s-library", "path": "/library", "needsSetup": false, "setup": "" },
  { "slug": "s-liked-songs", "path": "/library/liked-songs", "needsSetup": true, "setup": "Like at least one track from Home before visiting." },
  { "slug": "s-search", "path": "/search", "needsSetup": false, "setup": "" },
  { "slug": "s-all-genres", "path": "/search/all-genres", "needsSetup": false, "setup": "" },
  { "slug": "s-genre-detail", "path": "/search/genre/electronic-dance", "needsSetup": false, "setup": "" },
  { "slug": "s-search-results", "path": "/search/results", "needsSetup": true, "setup": "Submit a query (e.g. 'Solaris') from /search first." },
  { "slug": "s-discover", "path": "/player/discover", "needsSetup": true, "setup": "Start playback of any track first." },
  { "slug": "s-lyrics", "path": "/player/lyrics", "needsSetup": true, "setup": "Start playback of any track first." },
  { "slug": "s-now-playing", "path": "/player/now-playing", "needsSetup": true, "setup": "Start playback of any track first." },
  { "slug": "s-queue", "path": "/player/queue", "needsSetup": true, "setup": "Start playback of any track first." },
  { "slug": "s-profile", "path": "/profile", "needsSetup": false, "setup": "" },
  { "slug": "s-account", "path": "/profile/account", "needsSetup": false, "setup": "" },
  { "slug": "s-audio-quality", "path": "/profile/audio-quality", "needsSetup": false, "setup": "" },
  { "slug": "s-downloads", "path": "/profile/downloads", "needsSetup": false, "setup": "" },
  { "slug": "s-settings", "path": "/profile/settings", "needsSetup": false, "setup": "" },
  { "slug": "s-settings-language", "path": "/profile/settings-language", "needsSetup": false, "setup": "" },
  { "slug": "s-support-history", "path": "/profile/support-history", "needsSetup": true, "setup": "Complete a donation first (see dashboard-demo-seed plan Task 3 Step 4)." },
  { "slug": "s-become-artist", "path": "/profile/artist/become-artist", "needsSetup": false, "setup": "" },
  { "slug": "s-artist-setup", "path": "/profile/artist/setup", "needsSetup": false, "setup": "" },
  { "slug": "s-upload-track", "path": "/profile/artist/upload-track", "needsSetup": false, "setup": "" },
  { "slug": "s27-dashboard-overview", "path": "/profile/artist/dashboard", "needsSetup": true, "setup": "Complete dashboard-demo-seed plan Task 3 fully first." },
  { "slug": "s27-dashboard-analytics", "path": "/profile/artist/dashboard/analytics", "needsSetup": true, "setup": "Same as dashboard overview." },
  { "slug": "s27-dashboard-promotion", "path": "/profile/artist/dashboard/promotion", "needsSetup": true, "setup": "Same as dashboard overview." },
  { "slug": "s27-dashboard-studio-pro", "path": "/profile/artist/dashboard/studio-pro", "needsSetup": true, "setup": "Same as dashboard overview." },
  { "slug": "sheet-add-to-playlist", "path": "/sheets/add-to-playlist", "needsSetup": true, "setup": "Open via a track's options menu, not direct URL — needs a track id param." },
  { "slug": "sheet-demo-audio", "path": "/sheets/demo-audio", "needsSetup": true, "setup": "Open via Now Playing's 'Demo audio' credits link while a track is playing." },
  { "slug": "sheet-notifications", "path": "/sheets/notifications", "needsSetup": false, "setup": "" },
  { "slug": "sheet-options", "path": "/sheets/options", "needsSetup": true, "setup": "Open via a track's options button — needs a track/kind param." },
  { "slug": "sheet-support-confirm", "path": "/sheets/support-confirm", "needsSetup": true, "setup": "Open via Support flow after selecting an amount." },
  { "slug": "sheet-support-success", "path": "/sheets/support-success", "needsSetup": true, "setup": "Open by completing the Support flow." },
  { "slug": "sheet-support", "path": "/sheets/support", "needsSetup": true, "setup": "Open via an artist profile's Donate button." },
  { "slug": "s09-album-detail", "path": "/album/horizon-deluxe", "needsSetup": false, "setup": "" },
  { "slug": "s08-artist-profile", "path": "/artist/solaris-echo", "needsSetup": false, "setup": "" },
  { "slug": "s-playlist-detail", "path": "/playlist/late-night-flow", "needsSetup": false, "setup": "Verify this playlist id exists in mocks/playlists.ts before running; substitute the real id if different." },
  { "slug": "s-track-detail", "path": "/track/midnight-mirage", "needsSetup": false, "setup": "" },
  { "slug": "s-create-playlist", "path": "/create-playlist", "needsSetup": false, "setup": "" },
  { "slug": "dev-demo-seed", "path": "/dev-demo-seed", "needsSetup": false, "setup": "Dev-only; captured for completeness." }
]
```

Note: confirm the `late-night-flow` playlist id against `apps/mobile/src/mocks/playlists.ts` before running Task 2 — substitute the real id if it differs (this is flagged in the manifest's `setup` field rather than guessed).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/kalemaimasheva/Desktop/Mmusic app" && npx jest scripts/demo-screenshots/__tests__/routes.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Write the capture script**

```javascript
// scripts/demo-screenshots/capture.mjs
// Clears and repopulates Mmusic-Demo-Screenshots/. Intended to be driven by
// an agent with Playwright MCP tools available (see
// docs/superpowers/plans/2026-10-12-demo-screenshots.md Task 2) — this file
// defines the route list and output layout; the actual navigate/screenshot
// calls are MCP tool calls made by the operator/agent per Task 2's steps,
// not by running this file standalone (there is no MCP client wired into a
// plain Node process here).
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import routes from './routes.json' assert { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = join(__dirname, '..', '..', 'Mmusic-Demo-Screenshots');

export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const DEV_SERVER_BASE_URL = 'http://localhost:8081';

export function resetOutputFolders() {
  rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  mkdirSync(join(OUTPUT_ROOT, 'desktop'), { recursive: true });
  mkdirSync(join(OUTPUT_ROOT, 'mobile'), { recursive: true });
}

export function outputPathFor(viewportName, slug) {
  return join(OUTPUT_ROOT, viewportName, `${slug}.png`);
}

export { routes };

if (import.meta.url === `file://${process.argv[1]}`) {
  resetOutputFolders();
  console.log(`Prepared ${OUTPUT_ROOT} for ${routes.length} routes x 2 viewports.`);
  console.log('Now follow Task 2 of the screenshot plan to drive capture via Playwright MCP tools.');
}
```

- [ ] **Step 6: Run it to prepare the output folder**

Run: `cd "/Users/kalemaimasheva/Desktop/Mmusic app" && node scripts/demo-screenshots/capture.mjs`
Expected: prints "Prepared .../Mmusic-Demo-Screenshots for 38 routes x 2 viewports."

- [ ] **Step 7: Add the output folder to `.gitignore`**

Append to `.gitignore` (repo root):

```
Mmusic-Demo-Screenshots/
```

- [ ] **Step 8: Commit**

```bash
git add scripts/demo-screenshots/capture.mjs scripts/demo-screenshots/routes.json scripts/demo-screenshots/__tests__/routes.test.mjs .gitignore
git commit -m "feat: add demo screenshot route manifest and output-folder script"
```

## Task 2: Drive the capture via Playwright MCP tools (operator/agent script, no app code)

Prerequisite: Task 1 committed, the Artist Dashboard demo-seed plan's Task 3 walkthrough already completed in the same dev server session (dashboard state is in-memory only — don't restart the server between that walkthrough and this capture run).

- [ ] **Step 1:** Confirm the dev server from the dashboard plan's walkthrough is still running at `http://localhost:8081` (or whatever port Expo printed). If it was restarted, redo the dashboard-demo-seed walkthrough first — the seeded state does not persist across reloads.
- [ ] **Step 2:** Run `node scripts/demo-screenshots/capture.mjs` to clear and recreate the output folders.
- [ ] **Step 3:** For each route in `routes.json`, in the order listed by category (Home → Library → Search → Player → Profile/Settings → Artist onboarding → Dashboard → Sheets → Content detail → Dev-only) — using the Playwright MCP tools already loaded this session:
  - If `needsSetup` is true, perform the action described in its `setup` field first (e.g. navigate Home → tap a track's like icon, before visiting `/library/liked-songs`).
  - For sheet routes, open them via their real trigger element (per `setup`) rather than navigating the URL directly, so they render as an overlay over their parent screen, matching the design.
  - Resize to `DESKTOP_VIEWPORT` (1440×900), navigate/trigger the route, wait for the screen's main content to be visible (not just "page loaded" — e.g. wait for the track list or stat cards to render, not just the shell), take a full-page screenshot, save to `Mmusic-Demo-Screenshots/desktop/<slug>.png`.
  - Resize to `MOBILE_VIEWPORT` (390×844), repeat without re-doing one-time setup that already persisted in app state (e.g. a liked track stays liked), save to `Mmusic-Demo-Screenshots/mobile/<slug>.png`.
- [ ] **Step 4:** Known issue to expect, not fix: the Discover screen's title and visible track artwork may disagree (recorded project issue) — capture as-is.

## Task 3: Verify the output set is complete

**Files:**
- Create: `scripts/demo-screenshots/verify.mjs`

- [ ] **Step 1: Write the verification script**

```javascript
// scripts/demo-screenshots/verify.mjs
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { outputPathFor, routes } from './capture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
let missing = [];

for (const route of routes) {
  for (const viewport of ['desktop', 'mobile']) {
    const path = outputPathFor(viewport, route.slug);
    if (!existsSync(path)) missing.push(path);
  }
}

if (missing.length > 0) {
  console.error(`Missing ${missing.length} of ${routes.length * 2} expected screenshots:`);
  missing.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}

console.log(`All ${routes.length * 2} screenshots present (${routes.length} routes x 2 viewports).`);
```

- [ ] **Step 2: Run it after Task 2's capture completes**

Run: `cd "/Users/kalemaimasheva/Desktop/Mmusic app" && node scripts/demo-screenshots/verify.mjs`
Expected: "All 76 screenshots present (38 routes x 2 viewports)." If anything is missing, re-run the corresponding step of Task 2 for that route/viewport before considering the deliverable complete.

- [ ] **Step 3: Commit**

```bash
git add scripts/demo-screenshots/verify.mjs
git commit -m "feat: add demo screenshot completeness verification script"
```
