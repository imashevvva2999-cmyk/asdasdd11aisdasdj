import { Fragment, useMemo, useState } from 'react';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { ConfirmDialog, DemoBadge, PageHeader, PermissionNote, StatusBadge } from '@mmusic/backoffice/ui';

import { useCrmCan } from '@/access';
import { useCrmActions, type ActionResult } from '@/data/actions';
import { CRM_PERMISSION_KEYS, CRM_ROLE_IDS, lockReason, PERMISSION_GROUPS, toggle, type CrmPermission, type RoleChange } from '@/domain/permissions';
import type { RoleConfig, StaffAssignment } from '@/domain/types';
import { fill, type CrmStringKey } from '@/strings';
import { AuditTable, SelectField, useCrm } from '@/ui';

const LOCK_KEYS: Record<NonNullable<ReturnType<typeof lockReason>>, CrmStringKey> = { always: 'lockAlways', 'viewer-read-only': 'lockViewer', 'lead-keeps-roles': 'lockLead' };

/**
 * Staff and roles (M6): the demo role of each fictional CRM staff member and the editable permission matrix of the
 * three prototype roles. Visible to every CRM role; changes need crm.roles.manage. Browser-local demonstration only.
 */
export function StaffRolesPage() {
  const { t, l, resultError } = useCrm();
  const bo = useBackoffice();
  const actions = useCrmActions();
  const canManage = useCrmCan('crm.roles.manage');
  const configs = useCollection<RoleConfig>('roles');
  const assignments = useCollection<StaffAssignment>('staffRoles');
  const events = useCollection<ActivityEvent>('activity');
  const roles = CRM_ROLE_IDS.map((id) => bo.roles.find((r) => r.id === id)).filter((r) => !!r);
  const saved = useMemo(() => new Map(configs.map((c) => [c.id, new Set(c.permissions)])), [configs]);
  const [draft, setDraft] = useState<Map<string, Set<string>> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [assign, setAssign] = useState<{ staffId: string; roleId: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string>();
  const current = draft ?? saved;
  const changes: RoleChange[] = CRM_ROLE_IDS.flatMap((roleId) =>
    CRM_PERMISSION_KEYS.filter((p) => (current.get(roleId)?.has(p) ?? false) !== (saved.get(roleId)?.has(p) ?? false)).map((p) => ({ roleId, permission: p, on: current.get(roleId)?.has(p) ?? false })),
  );
  const roleName = (id: string) => {
    const r = bo.roles.find((x) => x.id === id);
    return r ? l(r.label) : id;
  };
  const flip = (roleId: string, p: CrmPermission, on: boolean) => {
    const next = new Map(current);
    next.set(roleId, toggle(current.get(roleId) ?? new Set(), p, on));
    setDraft(next);
    setResult(null);
  };
  const close = (out: ActionResult) => {
    if (!out.ok) return setDialogError(resultError(out));
    setResult(out);
    setConfirming(false);
    setAssign(null);
    setResetting(null);
    setDraft(null);
  };
  const run = async (p: Promise<ActionResult>) => close(await p);

  return (
    <>
      <PageHeader title={t('rolesTitle')} subtitle={t('rolesSubtitle')} actions={<DemoBadge />} />
      <div style={{ marginBottom: 16 }}>
        <PermissionNote icon="warning-amber" text={t('rolesNote')} />
      </div>
      {!canManage && (
        <p className="bo-muted" data-note="roles-read-only" style={{ margin: '0 0 12px', fontSize: 13 }}>
          {t('viewOnlyRoles')}
        </p>
      )}
      {result?.ok && <output className="bo-saved">{t('savedNotice')}</output>}

      <div className="crm-columns bo-section">
        <section className="bo-card" aria-label={t('staffTitle')}>
          <h2>{t('staffTitle')}</h2>
          <ul className="bo-list crm-wrap-list">
            {bo.staff.map((s) => {
              const roleId = assignments.find((a) => a.id === s.id)?.roleId ?? s.roleId;
              return (
                <li key={s.id} data-staff={s.id} style={{ flexWrap: 'wrap' }}>
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {l(s.title)} · {s.email}
                    </span>
                  </span>
                  {canManage ? (
                    <span className="crm-staff-role">
                      <SelectField
                        label={t('assignRole')}
                        value={roleId}
                        onChange={(v) => {
                          setAssign({ staffId: s.id, roleId: v });
                          setDialogError(undefined);
                        }}
                        options={roles.map((r) => ({ value: r.id, label: l(r.label) }))}
                      />
                    </span>
                  ) : (
                    <StatusBadge tone="neutral" label={roleName(roleId)} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="bo-card" aria-label={t('colRoleName')}>
          <h2>{t('colRoleName')}</h2>
          <ul className="bo-list crm-wrap-list">
            {roles.map((r) => (
              <li key={r.id} data-role={r.id} style={{ flexWrap: 'wrap' }}>
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{l(r.label)}</span>
                  <span className="bo-muted" style={{ fontSize: 13 }}>
                    {l(r.description)} · {fill(t('capabilities'), { n: saved.get(r.id)?.size ?? 0, total: CRM_PERMISSION_KEYS.length })}
                  </span>
                </span>
                {canManage && (
                  <button
                    type="button"
                    className="bo-btn ghost small"
                    onClick={() => {
                      setResetting(r.id);
                      setDialogError(undefined);
                    }}
                  >
                    {t('resetRoleAction')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="bo-section" aria-label={t('matrixTitle')}>
        <div className="bo-card-head" style={{ flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{t('matrixTitle')}</h2>
          {canManage && (
            <span className="crm-head-actions">
              {changes.length > 0 && <span className="bo-muted">{fill(t('pendingChanges'), { n: changes.length })}</span>}
              <button type="button" className="bo-btn ghost small" disabled={changes.length === 0} onClick={() => setDraft(null)}>
                {t('discardMatrix')}
              </button>
              <button
                type="button"
                className="bo-btn small"
                disabled={changes.length === 0}
                onClick={() => {
                  setConfirming(true);
                  setDialogError(undefined);
                }}
              >
                {t('saveMatrix')}
              </button>
            </span>
          )}
        </div>
        {canManage && (
          <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            {t('matrixHint')}
          </p>
        )}
        <div className="bo-table-wrap">
          <table className="bo-table crm-matrix">
            <thead>
              <tr>
                <th>{t('colPermission')}</th>
                {roles.map((r) => (
                  <th key={r.id} style={{ textAlign: 'center' }}>
                    {l(r.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <tr className="crm-matrix-group">
                    <th colSpan={roles.length + 1} scope="colgroup">
                      {l(g.label)}
                    </th>
                  </tr>
                  {g.items.map((item) => (
                    <tr key={item.key} data-permission={item.key}>
                      <td style={{ minWidth: 220 }}>
                        {l(item.label)}
                        <span className="muted bo-sub">{item.key}</span>
                      </td>
                      {roles.map((r) => {
                        const lock = lockReason(r.id, item.key);
                        const on = current.get(r.id)?.has(item.key) ?? false;
                        const changed = on !== (saved.get(r.id)?.has(item.key) ?? false);
                        return (
                          <td key={r.id} style={{ textAlign: 'center' }} className={changed ? 'crm-matrix-changed' : undefined}>
                            <input
                              type="checkbox"
                              className="crm-check"
                              checked={on}
                              disabled={!canManage || !!lock}
                              title={lock ? t(LOCK_KEYS[lock]) : undefined}
                              aria-label={`${l(r.label)}: ${l(item.label)}${lock ? ` (${t(LOCK_KEYS[lock])})` : ''}`}
                              data-cell={`${r.id}:${item.key}`}
                              onChange={(e) => flip(r.id, item.key, e.target.checked)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bo-section" aria-label={t('rolesHistory')}>
        <h2>{t('rolesHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'role' || e.entity.type === 'staff')} />
      </section>

      <ConfirmDialog
        open={confirming}
        title={t('confirmMatrix')}
        body={fill(t('confirmMatrixBody'), { n: changes.length })}
        confirmLabel={t('saveMatrix')}
        error={dialogError}
        onConfirm={() => void run(actions.saveRoleChanges(changes))}
        onCancel={() => setConfirming(false)}
      />
      <ConfirmDialog
        open={assign !== null}
        title={assign ? fill(t('confirmAssign'), { name: bo.staff.find((s) => s.id === assign.staffId)?.name ?? '', role: roleName(assign.roleId) }) : ''}
        body={t('confirmAssignBody')}
        confirmLabel={t('save')}
        error={dialogError}
        onConfirm={() => {
          if (assign) void run(actions.assignStaffRole(assign.staffId, assign.roleId));
        }}
        onCancel={() => setAssign(null)}
      />
      <ConfirmDialog
        open={resetting !== null}
        title={resetting ? fill(t('confirmResetRole'), { role: roleName(resetting) }) : ''}
        body={t('confirmResetRoleBody')}
        confirmLabel={t('resetRoleAction')}
        error={dialogError}
        onConfirm={() => {
          if (resetting) void run(actions.resetRole(resetting));
        }}
        onCancel={() => setResetting(null)}
      />
    </>
  );
}
