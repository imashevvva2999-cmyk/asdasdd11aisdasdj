# Mmusic Private Management Demo — Prep Design

**Status:** Approved for implementation, reduced scope (2026-10-12). User will share the live site + Stitch designs with management directly, so screenshots are no longer needed. Execution order: **Plan B (Artist Dashboard) first, then Plan A (Kyrgyz catalog)**, via subagent-driven development with independent per-task review. Everything stays local — no push, merge, or deploy without separate approval. Tests must pass and a working local preview URL must be provided at the end.

## Context

A manager-facing private demo of Mmusic originally needed three things:
1. 20 real Kyrgyz tracks represented in the catalog, with a path to working playback once licensed audio is supplied (not now).
2. A fully populated, clearly-labeled mock Artist Dashboard, reached through the existing Become an Artist flow.
3. ~~Full-page screenshots of every existing screen/tab~~ — **removed from scope 2026-10-12**: the user will share the live site and Stitch designs with management directly instead.

Two active workstreams remain, each with its own plan, implemented in this order:
1. [2026-10-12-artist-dashboard-demo-seed.md](../plans/2026-10-12-artist-dashboard-demo-seed.md) (Plan B — implement first)
2. [2026-10-12-kyrgyz-track-catalog.md](../plans/2026-10-12-kyrgyz-track-catalog.md) (Plan A — implement second)

[2026-10-12-demo-screenshots.md](../plans/2026-10-12-demo-screenshots.md) (Plan C) is kept for reference only — **withdrawn from execution scope, do not implement.**

## Hard constraints (apply to all three plans)

- **No copyrighted audio is downloaded or bundled.** The user explicitly does not have licensed files yet and does not want playback implemented or substituted with generic instrumental audio for these 20 tracks. They will supply real audio later.
- **`GENRE_TAG_MAP`** (`apps/mobile/src/lib/genre-tracks.ts:10`) is explicitly commented as "a locked, user-approved mapping... do not extend or guess additional entries." It currently has 4 entries (`electronic-dance`, `chill-lofi`, `rock-indie`, `classical-film`) — `kyrgyz-music` is not among them, so the existing "Kyrgyz Music" genre (defined in `apps/mobile/src/mocks/genres.ts`) correctly shows zero tracks today. Adding an entry for the new tracks requires the user's explicit, separate sign-off — it is called out as its own gated task, not bundled into "add the tracks."
- **Preserve the existing 13 demo tracks and their playback** — CC-BY Kevin MacLeod instrumentals, documented in `apps/mobile/assets/audio/CREDITS.md`. Nothing in these plans touches `DEMO_SOURCES`, `tracks.ts`'s existing 13 entries, or the credits file's existing content.
- **No invented real-artist statistics.** The Artist Dashboard plan populates a *mock* local artist (`id: 'me'`, the only artist the Become an Artist flow can create) with realistic, clearly-commented demo numbers — it does not touch or fabricate data for any of the catalog's existing fictional artist entries (Solaris Echo, Kaelen, etc.).

## Workstream A — Kyrgyz track catalog (metadata + architecture, no audio)

20 real songs (research deliverable, see plan for the verified table with per-entry confidence) are added to the mock catalog as `Track`/`Artist` entries with no `DEMO_SOURCES` mapping. The existing `hasDemoAudio()`-false path (already built and used by the player/now-playing UI for any track without a bundled source) makes these show an honest "preview unavailable" state — zero player code changes needed. A documented, scripted **import workflow** describes exactly how to drop in real licensed audio later. Extending `GENRE_TAG_MAP` to surface these tracks under the "Kyrgyz Music" genre is a separate, explicitly-gated task in the same plan — not executed by default.

## Workstream B — Artist Dashboard demo population

The Become an Artist flow and all 4 dashboard tabs already exist and work (merged 2026-10-10). Populating the dashboard "through the existing flow" means: creating a profile and publishing a few tracks via the real UI (a scripted walkthrough, no code). Two small, honestly-labeled code changes close the remaining gap: (1) the Support stat card is currently hardcoded to `formatKgsAmount(0)` regardless of state — wire it to sum the artist's real `SupportHistoryEntry` records instead; (2) a dev-only seed action (same pattern as the existing `dev-ui-kit.tsx`, stripped from production/web-export builds) sets realistic non-zero `monthlyListeners` and a new `demoStreams` figure on the current local artist, clearly commented as demo-seed data.

## Workstream C — Screenshot inventory (WITHDRAWN 2026-10-12, not implemented)

Originally: capture against the Metro dev server using this session's browser-automation MCP tools, 38 routes × 2 viewports, output to `Mmusic-Demo-Screenshots/`. The user will instead share the live site and Stitch designs with management directly. The plan document is retained as reference only in case this is needed later — it must not be executed as part of this round.

## Execution requirements (added 2026-10-12)

- Subagent-driven development: a fresh subagent implements each task, a fresh reviewer checks it before the next task starts, plus a whole-branch review at the end of each plan.
- Order: Plan B fully implemented and reviewed before Plan A begins.
- All previously approved UI, animations, gestures, and navigation are preserved — these plans add/fix logic, they do not restyle or restructure existing screens.
- Local only: no `git push`, no merge, no deploy, without the user's separate, explicit approval.
- Each plan's own test commands must pass before its tasks are considered done.
- After both plans are implemented and reviewed, start a local dev server and give the user a working preview URL.

## Explicitly out of scope / deferred

- Sourcing or licensing real Kyrgyz audio — user action, not this plan.
- Extending `GENRE_TAG_MAP` — gated task, needs separate explicit approval even after this spec/plan is approved.
- Fixing the known Discover-screen title/track-name mismatch bug (noted in project memory) — screenshots capture current behavior as-is unless the user asks for a fix first.
- The Analytics tab's known hardcoded-fallback-`trackId` edge case (prior project's accepted residual gap) — the dashboard plan avoids triggering it (seeded tracks are real published entries with matching ids) rather than fixing it.
- Reconciling the dashboard's tabbed layout vs. `docs/screens.md`'s "plain stack, no tab bar" description (OQ-51, already open and non-blocking) — not touched.
