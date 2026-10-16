#!/usr/bin/env node
/**
 * Demo Artist Account (dev/demo only): credential check, fixture contents,
 * sign-in / auto-save / reset / sign-out, and per-campaign analytics views.
 * Usage: npx tsx scripts/verify-demo-account.mjs
 */
import { createHash } from 'node:crypto';

import { demoLoginAvailability, verifyDemoCredentials } from '../src/demo/demo-config.ts';
import { attributedStreams, buildDemoArtistAnalytics } from '../src/demo/demo-analytics.ts';
import { DEMO_CAMPAIGN_HISTORY, demoTotals } from '../src/demo/demo-fixture.ts';
import { upsertEnv } from './setup-demo-login.mjs';
import { sha256Hex } from '../src/demo/sha256.ts';
import { resolveCampaignView } from '../src/lib/campaign-view.ts';
import { getArtistById } from '../src/mocks/index.ts';
import { useArtistStore } from '../src/state/artist-store.ts';
import { useCampaignStore } from '../src/state/campaign-store.ts';
import { enterGuestPreview, exitGuestPreview, useDemoSessionStore } from '../src/state/demo-session-store.ts';
import { isGuestPreview } from '../src/demo/guest-mode.ts';
import { useSupportStore } from '../src/state/support-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// Credentials: hash-only comparison, dev-only availability.
for (const v of ['', 'abc', 'пароль', '🎵 demo']) check(`sha256 matches node:crypto for ${JSON.stringify(v)}`, sha256Hex(v) === createHash('sha256').update(v).digest('hex'));
const config = { login: 'demo@example.test', passwordSha256: sha256Hex('correct horse') };
check('correct login + password is accepted', verifyDemoCredentials(' Demo@Example.test ', 'correct horse', config));
check('wrong password is rejected', !verifyDemoCredentials('demo@example.test', 'wrong', config));
check('wrong login is rejected', !verifyDemoCredentials('other@example.test', 'correct horse', config));
check('nothing configured rejects everything', !verifyDemoCredentials('', '', { login: '', passwordSha256: '' }));
check('production builds never enable the demo login', demoLoginAvailability(false) === 'production');

const catalogListeners = getArtistById('solaris-echo')?.monthlyListeners;

// Sign in → fixture loaded.
useDemoSessionStore.getState().signIn();
let artistState = useArtistStore.getState();
const published = artistState.entries.filter((e) => e.status === 'published');
check('sign-in activates the demo session', useDemoSessionStore.getState().active);
check('demo artist is Solaris Echo', artistState.artist?.id === 'solaris-echo' && artistState.artist?.name === 'Solaris Echo');
check('catalog has 10–12 tracks', artistState.entries.length >= 10 && artistState.entries.length <= 12);
check('10 published releases plus in-review and draft', published.length === 10 && artistState.entries.some((e) => e.status === 'processing') && artistState.entries.some((e) => e.status === 'draft'));
check('every release has a genre and a release date', artistState.entries.every((e) => e.genre && !Number.isNaN(Date.parse(e.createdAt))));
check('monthly listeners equal the summed 28-day analytics', artistState.artist?.monthlyListeners === demoTotals(artistState.entries).monthlyListeners);
check('one campaign in review is seeded', useCampaignStore.getState().launched.length === 1);
check('an unfinished draft is seeded (Ember Tide / BOOST)', useCampaignStore.getState().trackId === 'ember-tide' && useCampaignStore.getState().packageId === 'boost');

// Changes are written back into the persisted snapshot.
useCampaignStore.getState().setDescription('Changed during testing');
check('changes are saved into the demo snapshot', useDemoSessionStore.getState().snapshot?.campaign.description === 'Changed during testing');
check('the saved snapshot holds no bundle-local asset ids', useDemoSessionStore.getState().snapshot.entries.every((e) => typeof e.track.coverUri !== 'number'));

// Sign out → app cleared, catalog artist restored, snapshot kept.
useDemoSessionStore.getState().signOut();
check('sign-out clears the artist', useArtistStore.getState().artist === undefined && useArtistStore.getState().entries.length === 0);
check('sign-out clears campaigns', useCampaignStore.getState().launched.length === 0 && useCampaignStore.getState().trackId === undefined);
check('sign-out restores the public Solaris Echo profile', getArtistById('solaris-echo')?.monthlyListeners === catalogListeners);
check('sign-out keeps the saved demo state', useDemoSessionStore.getState().snapshot?.campaign.description === 'Changed during testing');

// Sign in again → saved state comes back.
useDemoSessionStore.getState().signIn();
check('signing in again restores the saved changes', useCampaignStore.getState().description === 'Changed during testing');

// Reset → original fixture.
useCampaignStore.setState({ launched: [] });
useDemoSessionStore.getState().resetDemo();
check('reset restores the original draft', useCampaignStore.getState().description === 'Autumn re-push of a Horizon (Deluxe) favourite');
check('reset restores seeded campaigns', useCampaignStore.getState().launched.length === 1);
check('reset keeps the session signed in', useDemoSessionStore.getState().active);
artistState = useArtistStore.getState();
check('reset restores the full catalog', artistState.entries.length === 12);

// Per-campaign analytics views.
const launched = useCampaignStore.getState().launched;
const active = resolveCampaignView(undefined, 'active-demo', launched, DEMO_CAMPAIGN_HISTORY);
const done = resolveCampaignView('demo-hist-obsidian', 'active-demo', launched, DEMO_CAMPAIGN_HISTORY);
const review = resolveCampaignView(launched[0].id, 'active-demo', launched, DEMO_CAMPAIGN_HISTORY);
check('no campaign id opens the active campaign', active.status === 'active' && active.data.trackId === 'midnight-mirage');
check('a completed card opens its own reach', done.status === 'completed' && done.data.reach === 41200 && done.data.progressPct === 100);
check('completed geography counts add up to its reach', Math.abs(done.data.geoBreakdown.reduce((s, g) => s + g.count, 0) - 41200 * 0.87) < 5);
check('an in-review card shows zero delivery against its forecast', review.status === 'review' && review.data.reach === 0 && review.data.reachGoal > 0);

// Artist-level DEMO analytics: consistent with Overview and Promotion.
const now = new Date('2026-10-16T12:00:00Z');
const an30 = buildDemoArtistAnalytics(artistState.entries, '30d', launched, now);
const an7 = buildDemoArtistAnalytics(artistState.entries, '7d', launched, now);
const an90 = buildDemoArtistAnalytics(artistState.entries, '90d', launched, now);
check('30-day listeners equal Overview listeners', an30.listeners === demoTotals(artistState.entries).monthlyListeners && an30.listeners === artistState.artist.monthlyListeners);
check('periods grow 7d < 30d < 90d', an7.streams < an30.streams && an30.streams < an90.streams);
check('trend points sum to the period streams', an30.trend.reduce((s, p) => s + p.value, 0) === an30.streams);
check('age groups sum to listeners and 100%', an30.ages.reduce((s, a) => s + a.count, 0) === an30.listeners && an30.ages.reduce((s, a) => s + a.pct, 0) === 100);
check('geography sums to listeners and 100%', an30.geography.reduce((s, g) => s + g.count, 0) === an30.listeners && an30.geography.reduce((s, g) => s + g.pct, 0) === 100);
check('traffic sources sum to streams', an30.sources.reduce((s, x) => s + x.count, 0) === an30.streams);
check('promo-attributed streams = active campaign impressions × CR', attributedStreams('30d', launched, now) === Math.round((active.data.reach * active.data.conversionRatePct) / 100));
check('90 days also counts the campaign completed Aug 30', attributedStreams('90d', launched, now) === attributedStreams('30d', launched, now) + Math.round((done.data.reach * done.data.conversionRatePct) / 100));
check('top tracks are the 5 most-streamed, descending', an30.topTracks.length === 5 && an30.topTracks.every((t, i, a) => i === 0 || a[i - 1].streams >= t.streams));
check('latest month equals the 30-day streams', an30.history.at(-1).streams === an30.streams && an30.history.length === 6);

// Credential setup script: replaces only the demo keys.
const env = upsertEnv('FOO=1\nEXPO_PUBLIC_DEMO_ARTIST_LOGIN=old\nBAR=2\n', { EXPO_PUBLIC_DEMO_ARTIST_LOGIN: 'new@x.test', EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256: 'a'.repeat(64) });
check('setup keeps unrelated env lines', env.includes('FOO=1') && env.includes('BAR=2'));
check('setup replaces the old login and adds the hash once', !env.includes('=old') && env.match(/EXPO_PUBLIC_DEMO_ARTIST_LOGIN=/g).length === 1 && env.includes(`SHA256=${'a'.repeat(64)}`));
check('re-running setup does not duplicate lines', upsertEnv(env, { EXPO_PUBLIC_DEMO_ARTIST_LOGIN: 'n@x.test', EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256: 'b'.repeat(64) }).match(/Demo Artist login/g).length === 1);

useDemoSessionStore.getState().signOut();

// Public Guest Preview: immutable fixture, read-only at the store layer, isolated from the personal account.
useDemoSessionStore.getState().signIn();
useCampaignStore.getState().setDescription('Personal edit');
useDemoSessionStore.getState().signOut();
const personalBefore = JSON.stringify(useDemoSessionStore.getState().snapshot);

enterGuestPreview();
check('guest preview is active', isGuestPreview());
check('guest loads the Solaris Echo fixture', useArtistStore.getState().artist?.name === 'Solaris Echo' && useArtistStore.getState().entries.length === 12);
check('guest uses the original fixture, not personal edits', useCampaignStore.getState().description === 'Autumn re-push of a Horizon (Deluxe) favourite');
check('guest never activates the personal session', useDemoSessionStore.getState().active === false);

const before = JSON.stringify({ c: useCampaignStore.getState(), a: useArtistStore.getState().entries.length });
useCampaignStore.getState().startCampaign('horizon');
useCampaignStore.getState().selectPackage('spotlight');
useCampaignStore.getState().toggleGenre('pop');
useCampaignStore.getState().setDescription('guest edit');
useCampaignStore.getState().setPaymentMethod('wallet');
useCampaignStore.getState().togglePause('active-demo');
useCampaignStore.getState().reset();
check('guest cannot create, edit or pause campaigns', JSON.stringify({ c: useCampaignStore.getState(), a: useArtistStore.getState().entries.length }) === before);
check('guest payment is refused', (await useCampaignStore.getState().confirm(765)) === 'failed' && useCampaignStore.getState().launched.length === 1);
let threw = false;
try { useArtistStore.getState().saveDraft({ title: 'x' }); } catch (e) { threw = e.name === 'ReadOnlyPreviewError'; }
check('guest cannot upload tracks', threw && useArtistStore.getState().entries.length === 12);
threw = false;
try { useArtistStore.getState().createArtistProfile({ stageName: 'Hacker' }); } catch (e) { threw = e.name === 'ReadOnlyPreviewError'; }
check('guest cannot edit the artist profile', threw && useArtistStore.getState().artist?.name === 'Solaris Echo');
const supportBefore = useSupportStore.getState().history.length;
useSupportStore.getState().startSupport('solaris-echo');
useSupportStore.getState().selectAmount(500);
await useSupportStore.getState().confirm();
check('guest cannot make donations', useSupportStore.getState().history.length === supportBefore);
check('guest never writes the personal demo snapshot', JSON.stringify(useDemoSessionStore.getState().snapshot) === personalBefore);

exitGuestPreview();
check('leaving the preview clears its data', !isGuestPreview() && useArtistStore.getState().artist === undefined);
useCampaignStore.getState().setDescription('works again');
check('stores are writable again after the preview', useCampaignStore.getState().description === 'works again');
useCampaignStore.getState().setDescription('');

if (failures > 0) {
  console.error(`\n${failures} demo-account check(s) failed.`);
  process.exit(1);
}
console.log('\nAll demo-account checks passed.');
