import { useState } from 'react';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCollection } from '@mmusic/backoffice/react';
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES } from '@mmusic/backoffice/review';
import { DemoBadge, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { useArmPreferences } from '@/access';
import { useArmActions } from '@/data/actions';
import { defaultPreferences, PREFERENCE_FIELDS, RECENT_SIZES, type PreferenceValues } from '@/domain/settings';
import { CATALOG_TABS, type CatalogTab, type QueueFilter } from '@/domain/types';
import type { ArmStringKey } from '@/strings';
import { EventTable, SelectField, useArm } from '@/ui';

const TAB_KEYS: Record<CatalogTab, ArmStringKey> = { tracks: 'tabCatalogTracks', albums: 'tabCatalogAlbums', artists: 'tabCatalogArtists', genres: 'tabCatalogGenres', playlists: 'tabCatalogPlaylists', demo: 'tabDemoListings' };
const pick = (p: PreferenceValues): PreferenceValues => Object.fromEntries(PREFERENCE_FIELDS.map((k) => [k, p[k]])) as PreferenceValues;

/**
 * ARM settings (M6, arm.settings.manage): default queue filters, display preferences and one labelled demo workflow
 * option. Frontend-only and local to this browser; saved changes go to the activity log.
 */
export function SettingsPage() {
  const { t, l, errorText } = useArm();
  const actions = useArmActions();
  const saved = pick(useArmPreferences());
  const events = useCollection<ActivityEvent>('activity');
  const [draft, setDraft] = useState<PreferenceValues | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = draft ?? saved;
  const dirty = PREFERENCE_FIELDS.some((k) => form[k] !== saved[k]);
  const defaults = pick(defaultPreferences());
  const set = <K extends keyof PreferenceValues>(key: K, value: PreferenceValues[K]) => {
    setDraft({ ...form, [key]: value });
    setNotice(false);
    setError(undefined);
  };
  const statusOptions = [{ value: '', label: t('allStatuses') }, ...REVIEW_STATUSES.map((s) => ({ value: s, label: l(REVIEW_STATUS_LABELS[s]) }))];
  const save = async () => {
    setBusy(true);
    const failed = await actions.updatePreferences(form);
    setBusy(false);
    if (failed) return setError(errorText(failed));
    setDraft(null);
    setNotice(true);
  };

  return (
    <>
      <PageHeader title={t('settingsTitle')} subtitle={t('settingsSubtitle')} actions={<DemoBadge />} />
      <div style={{ marginBottom: 16 }}>
        <PermissionNote icon="science" text={t('settingsNote')} />
      </div>
      {notice && <output className="bo-saved">{t('savedNotice')}</output>}

      <form
        className="bo-section"
        aria-label={t('settingsTitle')}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="arm-columns">
          <section className="bo-card" aria-labelledby="arm-queue-defaults">
            <h2 id="arm-queue-defaults">{t('queueDefaults')}</h2>
            <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
              {t('queueDefaultsHint')}
            </p>
            <SelectField label={t('prefModerationStatus')} value={form.moderationStatus} onChange={(v) => set('moderationStatus', v as QueueFilter)} options={statusOptions} />
            <SelectField label={t('prefArtistStatus')} value={form.artistStatus} onChange={(v) => set('artistStatus', v as QueueFilter)} options={statusOptions} />
            <SelectField label={t('prefCampaignStatus')} value={form.campaignStatus} onChange={(v) => set('campaignStatus', v as QueueFilter)} options={statusOptions} />
          </section>
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="bo-card" aria-labelledby="arm-display">
              <h2 id="arm-display">{t('display')}</h2>
              <SelectField label={t('prefCatalogTab')} value={form.catalogTab} onChange={(v) => set('catalogTab', v as CatalogTab)} options={CATALOG_TABS.map((tab) => ({ value: tab, label: t(TAB_KEYS[tab]) }))} />
              <SelectField label={t('prefRecentActivity')} value={String(form.recentActivity)} onChange={(v) => set('recentActivity', Number(v))} options={RECENT_SIZES.map((n) => ({ value: String(n), label: String(n) }))} />
            </section>
            <section className="bo-card" aria-labelledby="arm-demo-workflow">
              <h2 id="arm-demo-workflow">
                {t('demoWorkflow')} <DemoBadge />
              </h2>
              <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
                {t('demoWorkflowHint')}
              </p>
              <label className="arm-switch">
                <input type="checkbox" className="arm-check" checked={form.nextAfterDecision} onChange={(e) => set('nextAfterDecision', e.target.checked)} />
                {t('prefNextAfterDecision')}
              </label>
            </section>
          </div>
        </div>

        {error && (
          <p className="bo-field-error" role="alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        )}
        {draft && dirty && PREFERENCE_FIELDS.every((k) => form[k] === defaults[k]) && (
          <p className="bo-muted" style={{ marginTop: 16, fontSize: 13 }}>
            {t('defaultsPending')}
          </p>
        )}
        <div className="bo-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="bo-btn" disabled={!dirty || busy}>
            {t('saveSettings')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={!dirty} onClick={() => setDraft(null)}>
            {t('discardSettings')}
          </button>
          <button
            type="button"
            className="bo-btn ghost"
            disabled={PREFERENCE_FIELDS.every((k) => form[k] === defaults[k])}
            onClick={() => {
              setDraft(defaults);
              setNotice(false);
            }}
          >
            {t('defaultSettings')}
          </button>
        </div>
      </form>

      <section className="bo-section" aria-labelledby="arm-settings-history">
        <h2 id="arm-settings-history">{t('settingsHistory')}</h2>
        <EventTable events={events.filter((e) => e.entity.type === 'setting')} showEntity={false} />
      </section>
    </>
  );
}
