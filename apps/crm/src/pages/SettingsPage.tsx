import { useState } from 'react';
import { Link } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCollection } from '@mmusic/backoffice/react';
import { ConfirmDialog, DemoBadge, EmptyState, PageHeader, PermissionNote, StatusBadge } from '@mmusic/backoffice/ui';

import { usePipeline } from '@/access';
import { useCrmActions, type ActionResult } from '@/data/actions';
import type { FieldErrors } from '@/domain/rules';
import { openStages, stageInUse, tagUsage, type StageLabelField } from '@/domain/settings';
import type { CrmContact, CrmOrganization, Deal, StageConfig, TagRecord } from '@/domain/types';
import { fill, type CrmStringKey } from '@/strings';
import { AuditTable, TextField, useCrm, useQueryState } from '@/ui';

import { ChoiceDialog, Notice, PreferenceSettings } from './SettingsParts';

const TABS = ['pipeline', 'tags', 'preferences'] as const;
type Tab = (typeof TABS)[number];
const TAB_KEYS: Record<Tab, CrmStringKey> = { pipeline: 'tabPipeline', tags: 'tabTags', preferences: 'tabPreferences' };
const SETTING_TYPES = new Set(['stage', 'tag', 'setting']);

/** CRM settings (M6, crm.settings.manage): pipeline stages, tags and preferences, with their change log. */
export function SettingsPage() {
  const { t } = useCrm();
  const query = useQueryState();
  const tab = (TABS as readonly string[]).includes(query.get('tab')) ? (query.get('tab') as Tab) : 'pipeline';
  const events = useCollection<ActivityEvent>('activity');
  return (
    <>
      <PageHeader title={t('settingsTitle')} subtitle={t('settingsSubtitle')} actions={<DemoBadge />} />
      <nav className="bo-tabs" aria-label={t('settingsTitle')}>
        {TABS.map((key) => (
          <Link key={key} to={`/settings?tab=${key}`} className={key === tab ? 'bo-tab active' : 'bo-tab'} aria-current={key === tab ? 'page' : undefined}>
            {t(TAB_KEYS[key])}
          </Link>
        ))}
      </nav>
      {tab === 'pipeline' && <PipelineSettings />}
      {tab === 'tags' && <TagSettings />}
      {tab === 'preferences' && <PreferenceSettings />}
      <section className="bo-section" aria-label={t('settingsHistory')} style={{ marginTop: 24 }}>
        <h2>{t('settingsHistory')}</h2>
        <AuditTable events={events.filter((e) => SETTING_TYPES.has(e.entity.type))} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------- pipeline

function PipelineSettings() {
  const { t, l, fieldError, resultError } = useCrm();
  const actions = useCrmActions();
  const pipeline = usePipeline();
  const deals = useCollection<Deal>('deals');
  const events = useCollection<ActivityEvent>('activity');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [newLabel, setNewLabel] = useState({ ru: '', en: '' });
  const [newErrors, setNewErrors] = useState<FieldErrors<StageLabelField>>({});
  const [renaming, setRenaming] = useState<StageConfig | null>(null);
  const [renameLabel, setRenameLabel] = useState({ ru: '', en: '' });
  const [renameErrors, setRenameErrors] = useState<FieldErrors<StageLabelField>>({});
  const [disabling, setDisabling] = useState<StageConfig | null>(null);
  const [target, setTarget] = useState('');
  const [targetError, setTargetError] = useState<string>();
  const [deleting, setDeleting] = useState<StageConfig | null>(null);
  const [dialogError, setDialogError] = useState<string>();
  const open = openStages(pipeline.config, false);
  const rows = [...open, ...pipeline.config.filter((s) => s.kind !== 'open').sort((a, b) => a.order - b.order)];
  const count = (id: string) => deals.filter((d) => d.stage === id).length;
  const run = async (p: Promise<ActionResult>) => setResult(await p);

  const add = async () => {
    const out = await actions.addStage(newLabel);
    setResult(out);
    if (out.ok) setNewLabel({ ru: '', en: '' });
    setNewErrors(!out.ok && out.error === 'invalid' ? out.fields : {});
  };
  const rename = async () => {
    if (!renaming) return;
    const out = await actions.renameStage(renaming.id, renameLabel);
    setResult(out);
    if (out.ok) setRenaming(null);
    setRenameErrors(!out.ok && out.error === 'invalid' ? out.fields : {});
  };
  const disable = async () => {
    if (!disabling) return;
    const out = await actions.disableStage(disabling.id, target || undefined);
    if (!out.ok && out.error === 'invalid') return setTargetError(fieldError(out.fields.target));
    if (!out.ok) return setDialogError(resultError(out));
    setDisabling(null);
    setResult(out);
  };
  const remove = async () => {
    if (!deleting) return;
    const out = await actions.deleteStage(deleting.id);
    if (!out.ok) return setDialogError(resultError(out));
    setDeleting(null);
    setResult(out);
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon="info-outline" text={t('pipelineNote')} />
      </div>
      <Notice result={result} />
      <div className="bo-table-wrap" style={{ marginBottom: 16 }}>
        <table className="bo-table">
          <thead>
            <tr>
              <th>{t('colOrder')}</th>
              <th>{t('colStageName')}</th>
              <th>{t('colState')}</th>
              <th style={{ textAlign: 'right' }}>{t('colDealsCount')}</th>
              <th>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const idx = open.indexOf(s);
              const isOpen = s.kind === 'open';
              return (
                <tr key={s.id} data-stage-row={s.id}>
                  <td className="muted">{isOpen ? idx + 1 : '—'}</td>
                  <td style={{ minWidth: 200 }}>
                    {l(s.label)}
                    <span className="muted bo-sub">
                      {s.label.ru} / {s.label.en} · {isOpen ? (s.custom ? t('stageCustom') : t('stageBuiltIn')) : t('stageSystem')}
                    </span>
                  </td>
                  <td>
                    <StatusBadge tone={s.enabled ? 'success' : 'neutral'} label={s.enabled ? t('stateEnabled') : t('stateDisabled')} />
                  </td>
                  <td className="muted" style={{ textAlign: 'right' }}>
                    {count(s.id)}
                  </td>
                  <td aria-label={t('colActions')}>
                    <span className="crm-row-actions">
                      {isOpen && (
                        <>
                          <button type="button" className="bo-btn ghost small" disabled={idx <= 0} aria-label={`${t('moveUp')}: ${l(s.label)}`} onClick={() => void run(actions.moveStage(s.id, -1))}>
                            ↑
                          </button>
                          <button type="button" className="bo-btn ghost small" disabled={idx < 0 || idx >= open.length - 1} aria-label={`${t('moveDown')}: ${l(s.label)}`} onClick={() => void run(actions.moveStage(s.id, 1))}>
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="bo-btn ghost small"
                        onClick={() => {
                          setRenaming(s);
                          setRenameLabel({ ...s.label });
                          setRenameErrors({});
                        }}
                      >
                        {t('renameAction')}
                      </button>
                      {isOpen &&
                        (s.enabled ? (
                          <button
                            type="button"
                            className="bo-btn ghost small"
                            onClick={() => {
                              setDisabling(s);
                              setTarget('');
                              setTargetError(undefined);
                              setDialogError(undefined);
                            }}
                          >
                            {t('disableAction')}
                          </button>
                        ) : (
                          <button type="button" className="bo-btn ghost small" onClick={() => void run(actions.enableStage(s.id))}>
                            {t('enableAction')}
                          </button>
                        ))}
                      {s.custom && !stageInUse(s.id, deals, events) && (
                        <button
                          type="button"
                          className="bo-btn ghost small"
                          onClick={() => {
                            setDeleting(s);
                            setDialogError(undefined);
                          }}
                        >
                          {t('deleteAction')}
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="crm-columns">
        {renaming && (
          <form
            className="bo-card crm-form"
            aria-label={fill(t('renameStageTitle'), { name: l(renaming.label) })}
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <h2>{fill(t('renameStageTitle'), { name: l(renaming.label) })}</h2>
            <TextField label={t('fieldLabelRu')} required value={renameLabel.ru} onChange={(v) => setRenameLabel((x) => ({ ...x, ru: v }))} error={fieldError(renameErrors.ru)} />
            <TextField label={t('fieldLabelEn')} required value={renameLabel.en} onChange={(v) => setRenameLabel((x) => ({ ...x, en: v }))} error={fieldError(renameErrors.en)} />
            <div className="crm-form-actions">
              <button type="submit" className="bo-btn">
                {t('save')}
              </button>
              <button type="button" className="bo-btn ghost" onClick={() => setRenaming(null)}>
                {t('cancel')}
              </button>
            </div>
          </form>
        )}
        <form
          className="bo-card crm-form"
          aria-label={t('addStageTitle')}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <h2>{t('addStageTitle')}</h2>
          <TextField label={t('fieldLabelRu')} required value={newLabel.ru} onChange={(v) => setNewLabel((x) => ({ ...x, ru: v }))} error={fieldError(newErrors.ru)} />
          <TextField label={t('fieldLabelEn')} required value={newLabel.en} onChange={(v) => setNewLabel((x) => ({ ...x, en: v }))} error={fieldError(newErrors.en)} />
          <button type="submit" className="bo-btn">
            {t('addStageAction')}
          </button>
        </form>
      </div>
      {disabling && count(disabling.id) > 0 ? (
        <ChoiceDialog
          open
          title={fill(t('confirmDisableStage'), { name: l(disabling.label) })}
          body={`${t('confirmDisableStageBody')} ${fill(t('disableMoveHint'), { n: count(disabling.id) })}`}
          label={t('fieldTargetStage')}
          options={pipeline.open.filter((s) => s.id !== disabling.id).map((s) => ({ value: s.id, label: l(s.label) }))}
          value={target}
          onChange={(v) => {
            setTarget(v);
            setTargetError(undefined);
          }}
          confirmLabel={t('disableAction')}
          error={targetError ?? dialogError}
          onConfirm={() => void disable()}
          onCancel={() => setDisabling(null)}
        />
      ) : (
        <ConfirmDialog
          open={disabling !== null}
          title={disabling ? fill(t('confirmDisableStage'), { name: l(disabling.label) }) : ''}
          body={t('confirmDisableStageBody')}
          confirmLabel={t('disableAction')}
          danger
          error={dialogError}
          onConfirm={() => void disable()}
          onCancel={() => setDisabling(null)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? fill(t('confirmDeleteStage'), { name: l(deleting.label) }) : ''}
        body={t('confirmDeleteStageBody')}
        confirmLabel={t('deleteAction')}
        danger
        error={dialogError}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------- tags

function TagSettings() {
  const { t, fieldError, resultError } = useCrm();
  const actions = useCrmActions();
  const records = useCollection<TagRecord>('tags');
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState<string>();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const tags = tagUsage(records, contacts, organizations);
  const usedBy = (n: string) => {
    const u = tags.find((x) => x.name === n);
    return (u?.contacts ?? 0) + (u?.organizations ?? 0);
  };

  const add = async () => {
    const out = await actions.addTag(name);
    setResult(out);
    if (out.ok) setName('');
    setNameError(!out.ok && out.error === 'invalid' ? fieldError(out.fields.name) : undefined);
  };
  const rename = async () => {
    if (!renaming) return;
    const out = await actions.renameTag(renaming, newName);
    if (!out.ok) return setRenameError(out.error === 'invalid' ? fieldError(out.fields.name) : resultError(out));
    setRenaming(null);
    setResult(out);
  };
  const remove = async () => {
    if (!deleting) return;
    const out = await actions.deleteTag(deleting);
    if (!out.ok) return setDeleteError(resultError(out));
    setDeleting(null);
    setResult(out);
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon="science" text={t('tagsNote')} />
      </div>
      <Notice result={result} />
      {tags.length === 0 ? (
        <EmptyState icon="sell" title={t('noTags')} />
      ) : (
        <div className="bo-table-wrap" style={{ marginBottom: 16 }}>
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colTag')}</th>
                <th style={{ textAlign: 'right' }}>{t('colContactsUse')}</th>
                <th style={{ textAlign: 'right' }}>{t('colOrganizationsUse')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((x) => (
                <tr key={x.name} data-tag={x.name}>
                  <td>{x.name}</td>
                  <td className="muted" style={{ textAlign: 'right' }}>
                    {x.contacts}
                  </td>
                  <td className="muted" style={{ textAlign: 'right' }}>
                    {x.organizations}
                  </td>
                  <td aria-label={t('colActions')}>
                    <span className="crm-row-actions">
                      <button
                        type="button"
                        className="bo-btn ghost small"
                        onClick={() => {
                          setRenaming(x.name);
                          setNewName(x.name);
                          setRenameError(undefined);
                        }}
                      >
                        {t('renameAction')}
                      </button>
                      <button
                        type="button"
                        className="bo-btn ghost small"
                        onClick={() => {
                          setDeleting(x.name);
                          setDeleteError(undefined);
                        }}
                      >
                        {t('deleteAction')}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="crm-columns">
        {renaming && (
          <form
            className="bo-card crm-form"
            aria-label={fill(t('renameTagTitle'), { name: renaming })}
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <h2>{fill(t('renameTagTitle'), { name: renaming })}</h2>
            <TextField
              label={t('fieldNewName')}
              required
              value={newName}
              onChange={(v) => {
                setNewName(v);
                setRenameError(undefined);
              }}
              error={renameError}
            />
            <div className="crm-form-actions">
              <button type="submit" className="bo-btn">
                {t('save')}
              </button>
              <button type="button" className="bo-btn ghost" onClick={() => setRenaming(null)}>
                {t('cancel')}
              </button>
            </div>
          </form>
        )}
        <form
          className="bo-card crm-form"
          aria-label={t('addTagAction')}
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <TextField
            label={t('fieldTagName')}
            required
            value={name}
            onChange={(v) => {
              setName(v);
              setNameError(undefined);
            }}
            error={nameError}
          />
          <button type="submit" className="bo-btn">
            {t('addTagAction')}
          </button>
        </form>
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? fill(t('confirmDeleteTag'), { name: deleting }) : ''}
        body={fill(t('confirmDeleteTagBody'), { n: deleting ? usedBy(deleting) : 0 })}
        confirmLabel={t('deleteAction')}
        danger
        error={deleteError}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
