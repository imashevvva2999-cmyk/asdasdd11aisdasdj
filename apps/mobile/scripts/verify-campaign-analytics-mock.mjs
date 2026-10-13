#!/usr/bin/env node
/**
 * Campaign analytics mock data: deterministic, budget-safe invariants
 * (Promotion → Campaign Details). Usage:
 * npx tsx scripts/verify-campaign-analytics-mock.mjs
 */
import { getCampaignAnalytics } from '../src/lib/campaign-analytics-mock.ts';
import { getTrackAnalytics } from '../src/lib/analytics-mock.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const activeCampaign = {
  id: 'demo-cmp-osh',
  trackId: 'demo-release-night-osh',
  trackTitle: 'Night Train to Osh',
  goal: 'streams',
  budgetKgs: 5000,
  durationDays: 14,
  estimatedReach: 85000,
  reachSoFar: 61200,
  newFollowers: 1240,
  status: 'active',
  createdAt: new Date().toISOString(),
  paymentRef: 'DEMO-7Q2K4M',
  simulatedPayment: true,
};

const freshCampaign = { ...activeCampaign, id: 'test-fresh-campaign', reachSoFar: 0, newFollowers: 0, status: 'active' };
const completedCampaign = { ...activeCampaign, id: 'demo-cmp-issyk', status: 'completed' };
const shortCampaign = { ...activeCampaign, id: 'demo-cmp-steppe', durationDays: 7, estimatedReach: 9000, reachSoFar: 9600, status: 'completed' };

const a = getCampaignAnalytics(activeCampaign, 'lifetime');
const b = getCampaignAnalytics(activeCampaign, 'lifetime');
check('same campaign+period is deterministic (same numbers every call)', JSON.stringify(a) === JSON.stringify(b));

check('spentKgs never exceeds budgetKgs', a.spentKgs <= activeCampaign.budgetKgs);
check('remainingBudgetKgs + spentKgs equals budgetKgs', a.remainingBudgetKgs + a.spentKgs === activeCampaign.budgetKgs);
check('progressPct is between 0 and 100', a.progressPct >= 0 && a.progressPct <= 100);
check('dailySpend is monotonic non-decreasing', a.dailySpend.every((p, i) => i === 0 || p.value >= a.dailySpend[i - 1].value));
check('dailySpend last point equals spentKgs', a.dailySpend[a.dailySpend.length - 1].value === a.spentKgs);
check('ctrPct is between 0 and 100', a.ctrPct >= 0 && a.ctrPct <= 100);

const trackTotal = getTrackAnalytics(activeCampaign.trackId, 'all').streams;
check("attributedStreams never exceeds 15% of the track's total streams", a.attributedStreams <= Math.round(trackTotal * 0.15));

const countryPcts = a.audience.topCountries.reduce((s, c) => s + c.pct, 0);
check('audience topCountries percentages sum to 100', Math.round(countryPcts) === 100);
const cityPcts = a.audience.topCities.reduce((s, c) => s + c.pct, 0);
check('audience topCities percentages sum to 100', Math.round(cityPcts) === 100);
const agePcts = a.audience.ageGroups.reduce((s, c) => s + c.pct, 0);
check('audience ageGroups percentages sum to 100', Math.round(agePcts) === 100);
const devicePcts = a.audience.devices.reduce((s, c) => s + c.pct, 0);
check('audience devices percentages sum to 100', Math.round(devicePcts) === 100);

const fresh = getCampaignAnalytics(freshCampaign, 'lifetime');
check('a freshly created campaign (reachSoFar: 0) has zero impressions', fresh.impressions === 0);
check('a freshly created campaign has zero clicks', fresh.clicks === 0);
check('a freshly created campaign has zero spend', fresh.spentKgs === 0);
check('a freshly created campaign has zero attributed streams', fresh.attributedStreams === 0);
check('a freshly created campaign does not divide by zero (costPerClickKgs is 0, not NaN/Infinity)', fresh.costPerClickKgs === 0 && Number.isFinite(fresh.costPerClickKgs));
check('a freshly created campaign does not divide by zero (costPerAttributedStreamKgs is 0, not NaN/Infinity)', fresh.costPerAttributedStreamKgs === 0 && Number.isFinite(fresh.costPerAttributedStreamKgs));
check('a freshly created campaign has an all-zero daily performance chart (not just all-zero stat tiles)', fresh.dailyPerformance.every((p) => p.value === 0));

const completed = getCampaignAnalytics(completedCampaign, 'lifetime');
check('a completed campaign has progressPct of exactly 100', completed.progressPct === 100);
check('a completed campaign has daysRemaining of 0', completed.daysRemaining === 0);
check('a completed campaign has fully spent its budget', completed.spentKgs === completedCampaign.budgetKgs);

const period7d = getCampaignAnalytics(activeCampaign, '7d');
const period14d = getCampaignAnalytics(activeCampaign, '14d');
check('a 7-day period produces 7 chart points', period7d.dailyPerformance.length === 7);
check('a 14-day period produces 14 chart points (campaign duration allows it)', period14d.dailyPerformance.length === 14);

const period30dOnShort = getCampaignAnalytics(shortCampaign, '30d');
check("requesting a longer period than the campaign's duration clamps to the duration", period30dOnShort.dailyPerformance.length === 7);

if (failures > 0) {
  console.error(`\n${failures} campaign-analytics-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll campaign-analytics-mock checks passed.');
