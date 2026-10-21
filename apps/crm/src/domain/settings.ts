import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';

import { audit, crmCan, type Audit, type CrmContext } from './permissions.ts';
import type { FieldErrors } from './rules.ts';
import { TASK_PRIORITIES, type CrmContact, type CrmOrganization, type CrmPreferences, type Deal, type StageConfig, type TagRecord } from './types.ts';

/**
 * CRM settings (M6) as pure functions — pipeline stages, tags and preferences — each checked against
 * crm.settings.manage (prototype, browser-local) and returning the record patches plus their audit events.
 * Stage ids are stable; labels are only display text. A stage in use is never silently deleted: it can be disabled
 * with an explicit move of its deals to another stage, and only unused custom stages can be deleted.
 */

export type SettingsError = 'forbidden' | 'not-found' | 'same-status' | 'in-use' | 'last-open-stage' | 'system-stage';
type Fail<K extends string = never> = { ok: false; error: SettingsError } | { ok: false; error: 'invalid'; fields: FieldErrors<K> };
type Patch<T> = { id: string; patch: Partial<T> };

const canManage = (ctx: CrmContext) => crmCan(ctx.matrix, ctx.actor.roleId, 'crm.settings.manage');

// ---------------------------------------------------------------- pipeline

const stage = (id: string, kind: StageConfig['kind'], ru: string, en: string, order: number): StageConfig => ({ id, mock: true, kind, label: { ru, en }, enabled: true, order });

export function defaultPipeline(): StageConfig[] {
  return [
    stage('lead', 'open', 'Лид', 'Lead', 1),
    stage('qualified', 'open', 'Квалификация', 'Qualified', 2),
    stage('proposal', 'open', 'Предложение', 'Proposal', 3),
    stage('negotiation', 'open', 'Переговоры', 'Negotiation', 4),
    stage('won', 'won', 'Выиграна', 'Won', 90),
    stage('lost', 'lost', 'Проиграна', 'Lost', 91),
  ];
}

/** Open stages in order (all, or only enabled). */
export function openStages(config: readonly StageConfig[], enabledOnly = true): StageConfig[] {
  return config.filter((s) => s.kind === 'open' && (!enabledOnly || s.enabled)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** The stages shown on the board and in reports: enabled open stages, then won and lost. */
export function boardStages(config: readonly StageConfig[]): StageConfig[] {
  return [...openStages(config), ...config.filter((s) => s.kind !== 'open').sort((a, b) => a.order - b.order)];
}

export type StageLabelField = 'ru' | 'en';

export function validateStageLabel(label: Localized, config: readonly StageConfig[], exceptId?: string): FieldErrors<StageLabelField> {
  const fields: FieldErrors<StageLabelField> = {};
  for (const lang of ['ru', 'en'] as const) {
    const text = label[lang].trim();
    if (!text) fields[lang] = 'required';
    else if (text.length > 40) fields[lang] = 'too-long';
    else if (config.some((s) => s.id !== exceptId && s.label[lang].trim().toLocaleLowerCase() === text.toLocaleLowerCase())) fields[lang] = 'duplicate';
  }
  return fields;
}

const stageEvent = (action: string, s: Pick<StageConfig, 'id' | 'label'>, ctx: CrmContext, reason?: string) => audit({ action, entity: { type: 'stage', id: s.id, label: s.label.ru }, reason }, ctx);

/** Adds a custom open stage at the end of the open stages; its id is stable and never derived from the label. */
export function addStage(label: Localized, config: readonly StageConfig[], ctx: CrmContext): { ok: true; record: StageConfig; event: Audit } | Fail<StageLabelField> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const fields = validateStageLabel(label, config);
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  const used = new Set(config.map((s) => s.id));
  let n = config.filter((s) => s.custom).length + 1;
  while (used.has(`stage-${n}`)) n += 1;
  const order = Math.max(0, ...openStages(config, false).map((s) => s.order)) + 1;
  const record: StageConfig = { id: `stage-${n}`, mock: true, kind: 'open', label: { ru: label.ru.trim(), en: label.en.trim() }, enabled: true, order, custom: true };
  return { ok: true, record, event: stageEvent('stage.create', record, ctx) };
}

export function renameStage(id: string, label: Localized, config: readonly StageConfig[], ctx: CrmContext): { ok: true; patch: Patch<StageConfig>; event: Audit } | Fail<StageLabelField> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const current = config.find((s) => s.id === id);
  if (!current) return { ok: false, error: 'not-found' };
  const next = { ru: label.ru.trim(), en: label.en.trim() };
  if (next.ru === current.label.ru && next.en === current.label.en) return { ok: false, error: 'same-status' };
  const fields = validateStageLabel(next, config, id);
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  return { ok: true, patch: { id, patch: { label: next } }, event: stageEvent('stage.rename', { id, label: next }, ctx, `${current.label.ru} → ${next.ru}`) };
}

/** Moves an open stage one place up or down among the open stages (swaps the order with its neighbour). */
export function moveStage(id: string, direction: -1 | 1, config: readonly StageConfig[], ctx: CrmContext): { ok: true; patches: Patch<StageConfig>[]; event: Audit } | Fail {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const list = openStages(config, false);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { ok: false, error: config.some((s) => s.id === id) ? 'system-stage' : 'not-found' };
  const j = i + direction;
  if (j < 0 || j >= list.length) return { ok: false, error: 'same-status' };
  const a = list[i]!;
  const b = list[j]!;
  return { ok: true, patches: [{ id: a.id, patch: { order: b.order } }, { id: b.id, patch: { order: a.order } }], event: stageEvent('stage.reorder', a, ctx, `${a.label.ru} ↔ ${b.label.ru}`) };
}

/**
 * Disables an open stage. Deals still on it must be moved to `targetId` (an enabled open stage) — each move is an
 * audited deal stage change, so deal history stays intact. At least one open stage stays enabled.
 */
export function disableStage(id: string, targetId: string | undefined, config: readonly StageConfig[], deals: readonly Deal[], ctx: CrmContext): { ok: true; patch: Patch<StageConfig>; dealPatches: Patch<Deal>[]; events: Audit[] } | Fail<'target'> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const current = config.find((s) => s.id === id);
  if (!current) return { ok: false, error: 'not-found' };
  if (current.kind !== 'open') return { ok: false, error: 'system-stage' };
  if (!current.enabled) return { ok: false, error: 'same-status' };
  const others = openStages(config).filter((s) => s.id !== id);
  if (others.length === 0) return { ok: false, error: 'last-open-stage' };
  const affected = deals.filter((d) => d.stage === id);
  const target = others.find((s) => s.id === targetId);
  if (affected.length > 0 && !target) return { ok: false, error: 'invalid', fields: { target: 'required' } };
  const reason = `Этап «${current.label.ru}» отключён в настройках`;
  return {
    ok: true,
    patch: { id, patch: { enabled: false } },
    dealPatches: affected.map((d) => ({ id: d.id, patch: { stage: target!.id, stageChangedAt: ctx.now, updatedAt: ctx.now } })),
    events: [
      ...affected.map((d) => audit({ action: 'deal.stage', entity: { type: 'deal', id: d.id, label: d.title }, fromStatus: id, toStatus: target!.id, reason }, ctx)),
      stageEvent('stage.disable', current, ctx, affected.length > 0 ? `→ ${target!.label.ru}: ${affected.length}` : undefined),
    ],
  };
}

export function enableStage(id: string, config: readonly StageConfig[], ctx: CrmContext): { ok: true; patch: Patch<StageConfig>; event: Audit } | Fail {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const current = config.find((s) => s.id === id);
  if (!current) return { ok: false, error: 'not-found' };
  if (current.enabled) return { ok: false, error: 'same-status' };
  return { ok: true, patch: { id, patch: { enabled: true } }, event: stageEvent('stage.enable', current, ctx) };
}

export function stageInUse(id: string, deals: readonly Deal[], events: readonly ActivityEvent[]): boolean {
  return deals.some((d) => d.stage === id) || events.some((e) => e.entity.type === 'deal' && (e.fromStatus === id || e.toStatus === id));
}

/** Deletes a custom stage only when no deal is on it and no deal history mentions it. */
export function deleteStage(id: string, config: readonly StageConfig[], deals: readonly Deal[], events: readonly ActivityEvent[], ctx: CrmContext): { ok: true; event: Audit } | Fail {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const current = config.find((s) => s.id === id);
  if (!current) return { ok: false, error: 'not-found' };
  if (!current.custom) return { ok: false, error: 'system-stage' };
  if (stageInUse(id, deals, events)) return { ok: false, error: 'in-use' };
  return { ok: true, event: stageEvent('stage.delete', current, ctx) };
}

// ---------------------------------------------------------------- tags

export const normalizeTag = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export type TagUse = { name: string; contacts: number; organizations: number };
type TagData = { records: readonly TagRecord[]; contacts: readonly CrmContact[]; organizations: readonly CrmOrganization[] };

/** Every tag: registered ones and those typed on contacts / organizations, with usage counts, sorted by name. */
export function tagUsage(records: readonly TagRecord[], contacts: readonly CrmContact[], organizations: readonly CrmOrganization[]): TagUse[] {
  const names = new Set([...records.map((r) => r.name), ...contacts.flatMap((c) => c.tags), ...organizations.flatMap((o) => o.tags ?? [])]);
  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ name, contacts: contacts.filter((c) => c.tags.includes(name)).length, organizations: organizations.filter((o) => o.tags?.includes(name)).length }));
}

export function validateTagName(name: string, existing: readonly string[]): FieldErrors<'name'> {
  const n = normalizeTag(name);
  if (!n) return { name: 'required' };
  if (n.length > 30) return { name: 'too-long' };
  if (/[,;]/.test(n)) return { name: 'tag-invalid' };
  if (existing.includes(n)) return { name: 'duplicate' };
  return {};
}

const tagEvent = (action: string, name: string, ctx: CrmContext, reason?: string) => audit({ action, entity: { type: 'tag', id: name, label: name }, reason }, ctx);

export function addTag(name: string, existing: readonly string[], ctx: CrmContext): { ok: true; record: Omit<TagRecord, 'id' | 'mock'>; event: Audit } | Fail<'name'> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const fields = validateTagName(name, existing);
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  const n = normalizeTag(name);
  return { ok: true, record: { name: n, createdAt: ctx.now }, event: tagEvent('tag.create', n, ctx) };
}

export type TagEdit = { contactPatches: Patch<CrmContact>[]; organizationPatches: Patch<CrmOrganization>[]; recordPatches: Patch<TagRecord>[]; recordRemovals: string[]; newRecord?: Omit<TagRecord, 'id' | 'mock'> };

/** Renames a tag on every contact and organization and in the registry (no merging into an existing tag). */
export function renameTag(from: string, to: string, data: TagData, ctx: CrmContext): ({ ok: true; event: Audit } & TagEdit) | Fail<'name'> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const all = tagUsage(data.records, data.contacts, data.organizations).map((t) => t.name);
  if (!all.includes(from)) return { ok: false, error: 'not-found' };
  const n = normalizeTag(to);
  if (n === from) return { ok: false, error: 'same-status' };
  const fields = validateTagName(to, all);
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  const swap = (tags: string[]) => [...new Set(tags.map((t) => (t === from ? n : t)))];
  const record = data.records.find((r) => r.name === from);
  const contactPatches = data.contacts.filter((c) => c.tags.includes(from)).map((c) => ({ id: c.id, patch: { tags: swap(c.tags), updatedAt: ctx.now } }));
  const organizationPatches = data.organizations.filter((o) => o.tags?.includes(from)).map((o) => ({ id: o.id, patch: { tags: swap(o.tags ?? []), updatedAt: ctx.now } }));
  return {
    ok: true,
    contactPatches,
    organizationPatches,
    recordPatches: record ? [{ id: record.id, patch: { name: n } }] : [],
    recordRemovals: [],
    ...(record ? {} : { newRecord: { name: n, createdAt: ctx.now } }),
    event: tagEvent('tag.rename', n, ctx, `${from} → ${n} (${contactPatches.length + organizationPatches.length})`),
  };
}

/** Removes a tag from every contact and organization and from the registry (confirmed in the UI with the counts). */
export function deleteTag(name: string, data: TagData, ctx: CrmContext): ({ ok: true; event: Audit } & TagEdit) | Fail {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  if (!tagUsage(data.records, data.contacts, data.organizations).some((t) => t.name === name)) return { ok: false, error: 'not-found' };
  const contactPatches = data.contacts.filter((c) => c.tags.includes(name)).map((c) => ({ id: c.id, patch: { tags: c.tags.filter((t) => t !== name), updatedAt: ctx.now } }));
  const organizationPatches = data.organizations.filter((o) => o.tags?.includes(name)).map((o) => ({ id: o.id, patch: { tags: (o.tags ?? []).filter((t) => t !== name), updatedAt: ctx.now } }));
  return {
    ok: true,
    contactPatches,
    organizationPatches,
    recordPatches: [],
    recordRemovals: data.records.filter((r) => r.name === name).map((r) => r.id),
    event: tagEvent('tag.delete', name, ctx, String(contactPatches.length + organizationPatches.length)),
  };
}

// ---------------------------------------------------------------- preferences

export const PREFERENCES_ID = 'prefs';
export const AGENDA_SIZES = [4, 6, 8] as const;

export function defaultPreferences(): CrmPreferences {
  return { id: PREFERENCES_ID, mock: true, dealsView: 'board', agendaSize: 6, taskPriority: 'normal' };
}

export type PreferenceField = 'dealsView' | 'agendaSize' | 'taskPriority';

export function updatePreferences(current: CrmPreferences, next: Pick<CrmPreferences, PreferenceField>, ctx: CrmContext): { ok: true; patch: Partial<CrmPreferences>; event: Audit } | Fail<PreferenceField> {
  if (!canManage(ctx)) return { ok: false, error: 'forbidden' };
  const fields: FieldErrors<PreferenceField> = {};
  if (next.dealsView !== 'board' && next.dealsView !== 'list') fields.dealsView = 'required';
  if (!(AGENDA_SIZES as readonly number[]).includes(next.agendaSize)) fields.agendaSize = 'required';
  if (!TASK_PRIORITIES.includes(next.taskPriority)) fields.taskPriority = 'required';
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  const changed = (['dealsView', 'agendaSize', 'taskPriority'] as const).filter((k) => current[k] !== next[k]);
  if (changed.length === 0) return { ok: false, error: 'same-status' };
  return { ok: true, patch: { ...next, updatedAt: ctx.now }, event: audit({ action: 'settings.preferences', entity: { type: 'setting', id: PREFERENCES_ID, label: 'preferences' }, reason: changed.join(', ') }, ctx) };
}
