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
