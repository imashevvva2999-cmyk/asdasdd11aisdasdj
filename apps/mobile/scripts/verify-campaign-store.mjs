#!/usr/bin/env node
/**
 * Campaign Creation wizard state (src/state/campaign-store.ts). Exercises the
 * real store module directly via `tsx`, same approach as
 * scripts/verify-support-store.mjs. Usage: npx tsx scripts/verify-campaign-store.mjs
 */
import { isValidStartDate, parseIsoDay, setupIssues, toIsoDay, useCampaignStore } from '../src/state/campaign-store.ts';

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

// Inline validation: custom location needs at least one region; genres are required.
useCampaignStore.getState().setGeoScope('custom');
check('custom location with no regions is invalid', setupIssues(useCampaignStore.getState()).includes('noRegions'));
useCampaignStore.getState().toggleRegion('osh');
check('picking a region clears the region issue', setupIssues(useCampaignStore.getState()).length === 0);
useCampaignStore.getState().setGeoScope('bishkek');
check('no genres is invalid', setupIssues({ targetGenreIds: [], geoScope: 'all', customRegionIds: [] }).join() === 'noGenres');
useCampaignStore.getState().setDescription('x'.repeat(400));
check('setDescription() caps at 300 characters', useCampaignStore.getState().description.length === 300);
useCampaignStore.getState().setDescription('  Summer single  ');

useCampaignStore.getState().goToConfirm();
check('goToConfirm() advances the stage', useCampaignStore.getState().stage === 'confirming');

// Re-picking the same track mid-draft keeps package and audience choices.
useCampaignStore.getState().startCampaign('midnight-mirage');
check('startCampaign() with the same track keeps the package', useCampaignStore.getState().packageId === 'pro');
check('startCampaign() with the same track keeps the genres', useCampaignStore.getState().targetGenreIds.includes('chill-lofi'));
check('startCampaign() with the same track keeps the geo scope', useCampaignStore.getState().geoScope === 'bishkek');
useCampaignStore.getState().selectPackage('pro');

useCampaignStore.getState().toggleAgeGroup('35-44');
check('toggleAgeGroup() adds a specific group', useCampaignStore.getState().ageGroups.includes('35-44'));
useCampaignStore.getState().toggleAgeGroup('all');
check('toggleAgeGroup("all") is exclusive', useCampaignStore.getState().ageGroups.join() === 'all');
useCampaignStore.getState().toggleAgeGroup('18-24');
check('a specific group replaces "all"', useCampaignStore.getState().ageGroups.join() === '18-24');
useCampaignStore.getState().toggleAgeGroup('18-24');
check('removing the last group falls back to "all"', useCampaignStore.getState().ageGroups.join() === 'all');
useCampaignStore.getState().toggleAgeGroup('25-34');

// Wallet payment larger than the demo balance fails honestly.
useCampaignStore.getState().goToConfirm();
useCampaignStore.getState().setPaymentMethod('wallet');
const walletStart = useCampaignStore.getState().walletBalanceKgs;
const failedLaunched = useCampaignStore.getState().launched.length;
const failOutcome = await useCampaignStore.getState().confirm(walletStart + 1);
check('wallet payment above the balance returns failed', failOutcome === 'failed');
check('failed payment sets the failed stage and error', useCampaignStore.getState().stage === 'failed' && useCampaignStore.getState().paymentError === 'insufficientWallet');
check('failed payment records no campaign', useCampaignStore.getState().launched.length === failedLaunched);
useCampaignStore.getState().setPaymentMethod('mbank');
check('switching method clears the failure', useCampaignStore.getState().stage === 'confirming' && useCampaignStore.getState().paymentError === undefined);

// Cancelling mid-processing records nothing.
const pending = useCampaignStore.getState().confirm(765);
check('confirm() enters processing', useCampaignStore.getState().stage === 'processing');
useCampaignStore.getState().cancelPayment();
check('cancelPayment() returns to confirming', useCampaignStore.getState().stage === 'confirming');
check('cancelled payment resolves cancelled', (await pending) === 'cancelled');
check('cancelled payment records no campaign', useCampaignStore.getState().launched.length === failedLaunched);

useCampaignStore.getState().togglePause('camp-x');
check('togglePause() pauses', useCampaignStore.getState().pausedCampaignIds.includes('camp-x'));
useCampaignStore.getState().togglePause('camp-x');
check('togglePause() again resumes', !useCampaignStore.getState().pausedCampaignIds.includes('camp-x'));

const launchedBefore = useCampaignStore.getState().launched.length;
const okOutcome = await useCampaignStore.getState().confirm(765);
check('confirm() resolves success', okOutcome === 'success');
check('confirm() advances the stage to success', useCampaignStore.getState().stage === 'success');
check('confirm() appends exactly one launched campaign', useCampaignStore.getState().launched.length === launchedBefore + 1);

const newest = useCampaignStore.getState().launched[0];
check('the new entry records the right track', newest?.trackId === 'midnight-mirage');
check('the new entry records the right package', newest?.packageId === 'pro');
check('the new entry records the selected genre', newest?.genreIds.includes('chill-lofi'));
check('the new entry records the geo scope', newest?.geoScope === 'bishkek');
check('the new entry records the age groups', newest?.ageGroups.join() === '25-34');
check('the new entry records the total', newest?.totalKgs === 765);
check('the new entry records the trimmed description', newest?.description === 'Summer single');
check('a non-custom location records no custom regions', newest?.customRegionIds.length === 0);
check('an MBANK payment leaves the promo wallet untouched', useCampaignStore.getState().walletBalanceKgs === walletStart);

useCampaignStore.getState().startCampaign('midnight-mirage');
check('startCampaign() after success starts a fresh draft', useCampaignStore.getState().packageId === undefined);
useCampaignStore.getState().selectPackage('boost');
check('confirm() refuses an invalid draft (no genres)', (await useCampaignStore.getState().confirm(425)) === 'failed');
useCampaignStore.getState().toggleGenre('pop');
useCampaignStore.getState().setPaymentMethod('wallet');
await useCampaignStore.getState().confirm(425);
check('a wallet payment debits the promo wallet', useCampaignStore.getState().walletBalanceKgs === walletStart - 425);

useCampaignStore.getState().reset();
check('reset() clears the track', useCampaignStore.getState().trackId === undefined);
check('reset() clears the package', useCampaignStore.getState().packageId === undefined);
check('reset() returns to selectingTrack', useCampaignStore.getState().stage === 'selectingTrack');

// confirm() is a no-op without both a track and a package selected.
const launchedBeforeNoOp = useCampaignStore.getState().launched.length;
await useCampaignStore.getState().confirm(765);
check('confirm() without a track/package selected does not record a campaign', useCampaignStore.getState().launched.length === launchedBeforeNoOp);

// Campaign start date (Review & Pay calendar): today … one year ahead only.
const today = new Date();
const iso = (d) => toIsoDay(d);
const addDays = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
check('today is a valid start date', isValidStartDate(iso(today)));
check('a past day is rejected', !isValidStartDate(iso(addDays(-1))));
check('more than a year ahead is rejected', !isValidStartDate(iso(addDays(370))));
check('malformed / impossible dates are rejected', !isValidStartDate('2026-02-30') && !isValidStartDate('nope') && parseIsoDay('2026-13-01') === undefined);
useCampaignStore.getState().startCampaign('midnight-mirage');
useCampaignStore.getState().selectPackage('pro');
useCampaignStore.getState().toggleGenre('pop');
useCampaignStore.getState().setStartDate(iso(addDays(-3)));
check('setStartDate ignores a past day', useCampaignStore.getState().startDate === undefined);
useCampaignStore.getState().setStartDate(iso(addDays(10)));
check('setStartDate keeps a valid future day', useCampaignStore.getState().startDate === iso(addDays(10)));
useCampaignStore.getState().setPaymentMethod('mbank');
await useCampaignStore.getState().confirm(765);
check('the launched campaign records the chosen start date', useCampaignStore.getState().launched[0]?.startDate === iso(addDays(10)));

if (failures > 0) {
  console.error(`\n${failures} campaign-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll campaign-store checks passed.');
