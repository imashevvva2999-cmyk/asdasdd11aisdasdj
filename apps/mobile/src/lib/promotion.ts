/**
 * Song-promotion campaigns (Artist Dashboard → Promotion). Frontend demo:
 * reach figures are SIMULATED estimates, not an ad-delivery forecast.
 */
export type PromoGoal = 'streams' | 'followers' | 'playlists';
export type CampaignStatus = 'active' | 'paused' | 'completed';

export type Campaign = {
  id: string;
  trackId: string;
  trackTitle: string;
  goal: PromoGoal;
  budgetKgs: number;
  durationDays: number;
  /** Simulated reach estimate shown before paying. */
  estimatedReach: number;
  /** Simulated delivery so far (0 for a just-created campaign). */
  reachSoFar: number;
  newFollowers: number;
  status: CampaignStatus;
  createdAt: string;
  /** Reference returned by the payment adapter (demo references start with "DEMO-"). */
  paymentRef: string;
  /** True when the payment was simulated (always true until a live MBANK integration exists). */
  simulatedPayment: boolean;
};

export const PROMO_BUDGETS_KGS = [1000, 2500, 5000, 10000];
export const PROMO_DURATIONS_DAYS = [7, 14, 30];
export const PROMO_GOALS: PromoGoal[] = ['streams', 'followers', 'playlists'];

const GOAL_FACTOR: Record<PromoGoal, number> = { streams: 1, followers: 0.7, playlists: 0.55 };

/** SIMULATED reach range for a budget/duration/goal (deterministic, demo only). */
export function estimateCampaign(budgetKgs: number, durationDays: number, goal: PromoGoal): { reachLow: number; reachHigh: number } {
  const base = budgetKgs * 11 * (1 + durationDays / 30) * GOAL_FACTOR[goal];
  return { reachLow: Math.round((base * 0.8) / 100) * 100, reachHigh: Math.round((base * 1.2) / 100) * 100 };
}
