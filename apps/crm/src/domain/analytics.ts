import type { ActivityEvent, StaffUser } from '@mmusic/backoffice/domain';

import { dealOutcome } from './pipeline.ts';
import { isOpenTask, isOverdueTask } from './tasks.ts';
import { INTERACTION_KINDS, RELATIONSHIP_STATUSES, TASK_STATUSES, type CrmArtist, type CrmOrganization, type Deal, type DealStage, type Interaction, type InteractionKind, type RelationshipStatus, type Task, type TaskStatus } from './types.ts';

/**
 * CRM analytics (M5) as pure aggregations of the demo records in this browser. Deal values are summed fictional
 * estimates; there are no conversion rates, revenue, audience or growth figures. The period filter applies only to
 * dated activity (interactions, completions, change-log events) — snapshots such as stages and statuses are "now".
 */

export type Period = 'all' | '30d' | '7d';
export const PERIODS: readonly Period[] = ['all', '30d', '7d'];

export function periodStart(period: Period, now: string): string | undefined {
  if (period === 'all') return undefined;
  return new Date(Date.parse(now) - (period === '30d' ? 30 : 7) * 86_400_000).toISOString();
}

const inPeriod = (at: string | undefined, since: string | undefined, now: string) => !!at && at <= now && (!since || at >= since);

export type StageRow = { stage: DealStage; count: number; estimateKgs: number };

/**
 * Deal count and summed fictional estimate per stage, in pipeline order (`stageIds`: the shown stages — enabled open
 * stages, then won and lost). A stage that still holds deals but is not listed (e.g. disabled) is appended, so the
 * counts always add up to the number of deals.
 */
export function pipelineByStage(deals: Deal[], stageIds: readonly DealStage[]): StageRow[] {
  const extra = [...new Set(deals.map((d) => d.stage))].filter((s) => !stageIds.includes(s));
  return [...stageIds, ...extra].map((stage) => {
    const items = deals.filter((d) => d.stage === stage);
    return { stage, count: items.length, estimateKgs: items.reduce((s, d) => s + (d.estimatedValueKgs ?? 0), 0) };
  });
}

export type DealTotals = { open: number; won: number; lost: number; openEstimateKgs: number; wonEstimateKgs: number; withoutEstimate: number };

export function dealTotals(deals: Deal[]): DealTotals {
  const by = (o: 'open' | 'won' | 'lost') => deals.filter((d) => dealOutcome(d.stage) === o);
  const sum = (ds: Deal[]) => ds.reduce((s, d) => s + (d.estimatedValueKgs ?? 0), 0);
  return { open: by('open').length, won: by('won').length, lost: by('lost').length, openEstimateKgs: sum(by('open')), wonEstimateKgs: sum(by('won')), withoutEstimate: deals.filter((d) => d.estimatedValueKgs === undefined).length };
}

export type TaskTotals = { byStatus: Record<TaskStatus, number>; open: number; overdue: number; completedInPeriod: number };

export function taskTotals(tasks: Task[], now: string, since?: string): TaskTotals {
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length])) as Record<TaskStatus, number>;
  return { byStatus, open: tasks.filter(isOpenTask).length, overdue: tasks.filter((t) => isOverdueTask(t, now)).length, completedInPeriod: tasks.filter((t) => t.status === 'completed' && inPeriod(t.completedAt, since, now)).length };
}

export type ReminderTotals = { open: number; overdue: number; done: number };

export function reminderTotals(interactions: Interaction[], now: string): ReminderTotals {
  const withReminder = interactions.filter((i) => i.followUpAt);
  return { open: withReminder.filter((i) => !i.followUpDone).length, overdue: withReminder.filter((i) => !i.followUpDone && i.followUpAt! < now).length, done: withReminder.filter((i) => i.followUpDone).length };
}

export function interactionsByKind(interactions: Interaction[], now: string, since?: string): Record<InteractionKind, number> {
  return Object.fromEntries(INTERACTION_KINDS.map((k) => [k, interactions.filter((i) => i.kind === k && inPeriod(i.at, since, now)).length])) as Record<InteractionKind, number>;
}

export function relationshipDistribution(organizations: CrmOrganization[]): Record<RelationshipStatus, number> {
  return Object.fromEntries(RELATIONSHIP_STATUSES.map((s) => [s, organizations.filter((o) => o.relationship === s).length])) as Record<RelationshipStatus, number>;
}

/** Unified CRM: solo artists per collaboration status (same scale as organizations). */
export function collaborationDistribution(artists: Pick<CrmArtist, 'collaboration'>[]): Record<RelationshipStatus, number> {
  return Object.fromEntries(RELATIONSHIP_STATUSES.map((s) => [s, artists.filter((a) => a.collaboration === s).length])) as Record<RelationshipStatus, number>;
}

/** Unified CRM: deals with solo artists vs with groups and organizations (open / all). */
export function dealsByCounterparty(deals: Deal[]): { artists: number; organizations: number; openArtists: number; openOrganizations: number } {
  const withArtist = deals.filter((d) => d.artistId);
  const withOrg = deals.filter((d) => !d.artistId);
  const open = (ds: Deal[]) => ds.filter((d) => dealOutcome(d.stage) === 'open').length;
  return { artists: withArtist.length, organizations: withOrg.length, openArtists: open(withArtist), openOrganizations: open(withOrg) };
}

export type StaffRow = { staffId: string; openDeals: number; openTasks: number; overdueTasks: number; completedTasks: number; interactions: number; changes: number };

/** Per CRM staff member: current open deals and tasks, plus dated activity within the period. */
export function staffActivity(staff: StaffUser[], data: { deals: Deal[]; tasks: Task[]; interactions: Interaction[]; activity: ActivityEvent[] }, now: string, since?: string): StaffRow[] {
  return staff
    .filter((s) => s.app === 'crm')
    .map((s) => ({
      staffId: s.id,
      openDeals: data.deals.filter((d) => d.ownerId === s.id && dealOutcome(d.stage) === 'open').length,
      openTasks: data.tasks.filter((t) => t.assigneeId === s.id && isOpenTask(t)).length,
      overdueTasks: data.tasks.filter((t) => t.assigneeId === s.id && isOverdueTask(t, now)).length,
      completedTasks: data.tasks.filter((t) => t.completedBy === s.id && inPeriod(t.completedAt, since, now)).length,
      interactions: data.interactions.filter((i) => i.authorId === s.id && inPeriod(i.at, since, now)).length,
      changes: data.activity.filter((e) => e.actorId === s.id && inPeriod(e.at, since, now)).length,
    }));
}
