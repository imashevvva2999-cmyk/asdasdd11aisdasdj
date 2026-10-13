import { getTrackAnalytics, mulberry32, seedFromString } from './analytics-mock';
import type { LocalizedText } from './dashboard-i18n';
import type { Campaign } from './promotion';

/**
 * Deterministic mock campaign performance data (Artist Dashboard Promotion
 * → Campaign Details). No live or wall-clock-driven accrual: every figure
 * is derived from the campaign's own stored fields (reachSoFar, budgetKgs,
 * estimatedReach, goal), scaled by a PRNG seeded from the campaign's own
 * id — same architecture as lib/analytics-mock.ts. This guarantees a
 * brand-new campaign (reachSoFar: 0) shows zero everywhere, and spend can
 * never exceed budget by construction.
 */
export type CampaignPeriod = '7d' | '14d' | '30d' | 'lifetime';

export type CampaignChartPoint = { label: string; value: number };

export type CampaignAnalytics = {
  impressions: number;
  clicks: number;
  ctrPct: number;
  spentKgs: number;
  remainingBudgetKgs: number;
  costPerClickKgs: number;
  /** Populated regardless of goal; the UI only renders the metric matching campaign.goal. */
  attributedStreams: number;
  costPerAttributedStreamKgs: number;
  attributedNewFollowers: number;
  costPerFollowerKgs: number;
  attributedPlaylistAdds: number;
  progressPct: number;
  daysRemaining: number;
  dailyPerformance: CampaignChartPoint[];
  dailySpend: CampaignChartPoint[];
  audience: {
    topCountries: { name: LocalizedText; pct: number }[];
    topCities: { name: LocalizedText; pct: number }[];
    ageGroups: { label: LocalizedText; pct: number }[];
    devices: { name: LocalizedText; pct: number }[];
  };
};

const PERIOD_DAYS: Record<Exclude<CampaignPeriod, 'lifetime'>, number> = { '7d': 7, '14d': 14, '30d': 30 };

const COUNTRY_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Kyrgyzstan', ru: 'Кыргызстан' }, weight: 0.55 },
  { name: { en: 'Kazakhstan', ru: 'Казахстан' }, weight: 0.22 },
  { name: { en: 'Russia', ru: 'Россия' }, weight: 0.13 },
];

const CITY_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Bishkek', ru: 'Бишкек' }, weight: 0.5 },
  { name: { en: 'Osh', ru: 'Ош' }, weight: 0.2 },
  { name: { en: 'Almaty', ru: 'Алматы' }, weight: 0.15 },
];

const DEVICE_POOL: { name: LocalizedText; weight: number }[] = [
  { name: { en: 'Mobile app', ru: 'Мобильное приложение' }, weight: 0.6 },
  { name: { en: 'Web / desktop', ru: 'Веб / десктоп' }, weight: 0.25 },
  { name: { en: 'Smart speaker', ru: 'Умная колонка' }, weight: 0.07 },
];

const OTHER_LABEL: LocalizedText = { en: 'Other', ru: 'Другое' };

const AGE_POOL: { label: LocalizedText; weight: number }[] = [
  { label: { en: '18–24', ru: '18–24' }, weight: 0.3 },
  { label: { en: '25–34', ru: '25–34' }, weight: 0.35 },
  { label: { en: '35–44', ru: '35–44' }, weight: 0.2 },
];
const AGE_OTHER_LABEL: LocalizedText = { en: '45+', ru: '45+' };

function weightedSplit(rand: () => number, pool: { name: LocalizedText; weight: number }[], otherLabel: LocalizedText) {
  const raw = pool.map((p) => p.weight * (0.75 + rand() * 0.5));
  const sum = raw.reduce((s, v) => s + v, 0);
  const pcts = raw.map((v) => Math.round((v / sum) * 91));
  const last = 100 - pcts.reduce((s, v) => s + v, 0);
  return [...pool.map((p, i) => ({ name: p.name, pct: pcts[i]! })), { name: otherLabel, pct: last }];
}

function weightedAgeSplit(rand: () => number) {
  const raw = AGE_POOL.map((p) => p.weight * (0.75 + rand() * 0.5));
  const sum = raw.reduce((s, v) => s + v, 0);
  const pcts = raw.map((v) => Math.round((v / sum) * 91));
  const last = 100 - pcts.reduce((s, v) => s + v, 0);
  return [...AGE_POOL.map((p, i) => ({ label: p.label, pct: pcts[i]! })), { label: AGE_OTHER_LABEL, pct: last }];
}

export function getCampaignAnalytics(campaign: Campaign, period: CampaignPeriod): CampaignAnalytics {
  const rand = mulberry32(seedFromString(campaign.id));

  const progressPct =
    campaign.status === 'completed' ? 100 : Math.min(100, Math.round((campaign.reachSoFar / Math.max(1, campaign.estimatedReach)) * 100));
  const daysRemaining =
    campaign.status === 'completed' ? 0 : Math.max(0, campaign.durationDays - Math.round((progressPct / 100) * campaign.durationDays));

  const impressionsMultiplier = 3.2 + rand() * 2.3;
  const impressions = Math.round(campaign.reachSoFar * impressionsMultiplier);
  const ctrPct = Math.round((1.5 + rand() * 3) * 10) / 10;
  const clicks = Math.round(impressions * (ctrPct / 100));

  const spentKgs = Math.min(campaign.budgetKgs, Math.round(campaign.budgetKgs * (progressPct / 100)));
  const remainingBudgetKgs = campaign.budgetKgs - spentKgs;
  const costPerClickKgs = clicks > 0 ? Math.round((spentKgs / clicks) * 100) / 100 : 0;

  const trackTotalStreams = getTrackAnalytics(campaign.trackId, 'all').streams;
  const rawAttributedStreams = Math.round(clicks * (0.35 + rand() * 0.25));
  const attributedStreams = Math.min(rawAttributedStreams, Math.round(trackTotalStreams * 0.15));
  const costPerAttributedStreamKgs = attributedStreams > 0 ? Math.round((spentKgs / attributedStreams) * 100) / 100 : 0;

  const attributedNewFollowers = campaign.newFollowers;
  const costPerFollowerKgs = attributedNewFollowers > 0 ? Math.round((spentKgs / attributedNewFollowers) * 100) / 100 : 0;

  const attributedPlaylistAdds = Math.round(clicks * (0.03 + rand() * 0.04));

  const effectiveDays = period === 'lifetime' ? campaign.durationDays : Math.min(PERIOD_DAYS[period], campaign.durationDays);
  const safeDays = Math.max(1, effectiveDays);

  let trendValue = (impressions / safeDays) * 0.4;
  const dailyPerformance: CampaignChartPoint[] = Array.from({ length: safeDays }, (_, i) => {
    trendValue = Math.max(0, trendValue + (rand() - 0.3) * (impressions / safeDays) * 0.6);
    return { label: `D${i + 1}`, value: Math.round(trendValue) };
  });

  const spendWeights = Array.from({ length: safeDays }, () => 0.4 + rand());
  const totalWeight = spendWeights.reduce((s, w) => s + w, 0);
  let cumSpend = 0;
  const dailySpend: CampaignChartPoint[] = spendWeights.map((w, i) => {
    const isLast = i === safeDays - 1;
    const share = isLast ? spentKgs - cumSpend : Math.min(spentKgs - cumSpend, Math.round((w / totalWeight) * spentKgs));
    cumSpend += share;
    return { label: `D${i + 1}`, value: cumSpend };
  });

  return {
    impressions,
    clicks,
    ctrPct,
    spentKgs,
    remainingBudgetKgs,
    costPerClickKgs,
    attributedStreams,
    costPerAttributedStreamKgs,
    attributedNewFollowers,
    costPerFollowerKgs,
    attributedPlaylistAdds,
    progressPct,
    daysRemaining,
    dailyPerformance,
    dailySpend,
    audience: {
      topCountries: weightedSplit(rand, COUNTRY_POOL, OTHER_LABEL),
      topCities: weightedSplit(rand, CITY_POOL, OTHER_LABEL),
      ageGroups: weightedAgeSplit(rand),
      devices: weightedSplit(rand, DEVICE_POOL, OTHER_LABEL),
    },
  };
}
