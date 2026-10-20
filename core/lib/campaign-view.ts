import { ACTIVE_CAMPAIGN, PROMO_PACKAGES, type ActiveCampaign, type CampaignHistoryEntry } from '../mocks/promotions';
import type { LaunchedCampaign } from '../state/campaign-store';

export type CampaignView = {
  /** Pause-state / route key for this campaign. */
  key: string;
  status: 'active' | 'completed' | 'review';
  trackId?: string;
  /** Short display number, e.g. "8842" → "#PR-8842-MM". */
  number: string;
  data: ActiveCampaign;
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Campaign Analytics data for one campaign card (Promotion → history row or
 * "Detailed statistics"). The active campaign is the ACTIVE_CAMPAIGN mock;
 * completed campaigns derive every figure from their own recorded reach with
 * the same ratios, and campaigns still in review show zero delivery against
 * their package forecast — so each card opens numbers consistent with what
 * the card itself shows. All mock/demo data; no telemetry exists.
 */
export function resolveCampaignView(
  campaignId: string | undefined,
  activeKey: string,
  launched: LaunchedCampaign[],
  history: CampaignHistoryEntry[],
): CampaignView {
  const inReview = launched.find((c) => c.id === campaignId);
  if (inReview) {
    const pkg = PROMO_PACKAGES.find((p) => p.id === inReview.packageId);
    return {
      key: inReview.id,
      status: 'review',
      trackId: inReview.trackId,
      number: String(hash(inReview.id) % 10000).padStart(4, '0'),
      data: {
        trackId: inReview.trackId,
        dayOfTotal: { en: 'In review', ru: 'На модерации' },
        reach: 0,
        reachGoal: pkg?.forecastHigh ?? 0,
        conversionRatePct: 0,
        newFollowers: 0,
        progressPct: 0,
        geoBreakdown: [],
        playlistSaves: 0,
        profileVisits: 0,
      },
    };
  }

  const done = history.find((h) => h.id === campaignId);
  if (done) {
    const h = hash(done.id);
    return {
      key: done.id,
      status: 'completed',
      trackId: done.trackId,
      number: String(h % 10000).padStart(4, '0'),
      data: {
        trackId: done.trackId ?? '',
        dayOfTotal: done.completedLabel,
        reach: done.reach,
        reachGoal: done.reach,
        conversionRatePct: Math.round((6 + (h % 35) / 10) * 10) / 10,
        newFollowers: Math.round(done.reach * 0.025),
        progressPct: 100,
        geoBreakdown: (ACTIVE_CAMPAIGN.geoBreakdown ?? []).map((g) => ({ ...g, count: Math.round((done.reach * g.pct) / 100) })),
        playlistSaves: Math.round(done.reach * 0.011),
        profileVisits: Math.round(done.reach * 0.006),
      },
    };
  }

  return { key: activeKey, status: 'active', trackId: ACTIVE_CAMPAIGN.trackId, number: '8842', data: ACTIVE_CAMPAIGN };
}
