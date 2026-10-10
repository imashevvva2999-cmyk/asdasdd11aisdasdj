/**
 * Mock Promotion data (Artist Dashboard, Stitch "mmusic_boost"). No real
 * campaigns exist — launching one is explicitly disabled in the UI.
 */
export type PromoTool = { id: string; name: string; priceLabel: string; description: string; badge?: string };

export const PROMO_TOOLS: PromoTool[] = [
  {
    id: 'recommendation-boost',
    name: 'Recommendation Boost',
    priceLabel: 'From 1,500 сом',
    description: 'Priority placement in For You, New Releases, and Artist Radio mixes. AI targeting with high engagement.',
    badge: '3 formats',
  },
  {
    id: 'editorial-pitch',
    name: 'Editorial Pitch',
    priceLabel: '2 slots',
    description: 'Direct submission to curators: Top Kyrgyzstan, Electronic Chill, Evening Bishkek, and regional playlists.',
  },
  {
    id: 'home-banner',
    name: 'Home & Stories Banner',
    priceLabel: 'Premium',
    description: 'Exclusive hero visual in the app and a full-screen announcement in Stories, up to 180,000 impressions.',
    badge: 'Premium',
  },
];

export type ActiveCampaign = {
  trackId: string;
  dayOfTotal: string;
  reach: number;
  reachGoal: number;
  conversionRatePct: number;
  newFollowers: number;
  progressPct: number;
};

export const ACTIVE_CAMPAIGN: ActiveCampaign = {
  trackId: 'midnight-mirage',
  dayOfTotal: 'Day 4 of 10',
  reach: 12400,
  reachGoal: 25000,
  conversionRatePct: 8.4,
  newFollowers: 1041,
  progressPct: 49.6,
};

export type CampaignHistoryEntry = { id: string; trackTitle: string; metric: string; completedLabel: string; reach: number };

export const CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  { id: 'hist-vapor-trails', trackTitle: 'Vapor Trails', metric: '+42% streams', completedLabel: 'Completed Apr 28 · 10 days', reach: 34800 },
  { id: 'hist-horizon', trackTitle: 'Horizon (album)', metric: '+1,850 fans', completedLabel: 'Completed Mar 14 · 14 days', reach: 52100 },
];
