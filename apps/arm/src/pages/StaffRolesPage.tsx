import { Fragment, useMemo, useState } from 'react';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { ConfirmDialog, DemoBadge, PageHeader, PermissionNote, StatusBadge } from '@mmusic/backoffice/ui';

import { useArmCan } from '@/access';
import { useArmActions, type ActionError } from '@/data/actions';
import { ARM_PERMISSION_KEYS, ARM_ROLE_IDS, DEFAULT_ROLE_PERMISSIONS, lockReason, PERMISSION_GROUPS, toggle, type ArmPermission, type LockReason, type RoleChange } from '@/domain/permissions';
import type { RoleConfig, StaffAssignment } from '@/domain/types';
import { fill, type ArmStringKey } from '@/strings';
import { EventTable, SelectField, useArm } from '@/ui';

const LOCK_KEYS: Record<LockReason, ArmStringKey> = { always: 'lockAlways', 'read-only-role': 'lockReadOnly', 'super-keeps-roles': 'lockSuperAdmin' };
const SENSITIVE = new Set(PERMISSION_GROUPS.flatMap((g) => g.items.filter((i) => i.sensitive).map((i) => i.key)));

/**
 * Staff and roles (M6): the demo role of each fictional ARM staff member, the five provisional ARM roles and their
 * editable permission matrix. Visible to every ARM role; changes need arm.roles.manage. Browser-local demonstration only.
 */
export function StaffRolesPage() {
  const { t, l, errorText } = useArm();
  const bo = useBackoffice();
  const actions = useArmActions();
  const canManage = useArmCan('arm.roles.manage');
  const configs = useCollection<RoleConfig>('roles');
  const assignments = useCollection<StaffAssignment>('staffRoles');
  const events = useCollection<ActivityEvent>('activity');
  const roles = ARM_ROLE_IDS.map((id) => bo.roles.find((r) => r.id === id)).filter((r) => !!r);
  const saved = useMemo(() => new Map(configs.map((c) => [c.id, new Set(c.permissions)])), [configs]);
  const [draft, setDraft] = useState<Map<string, Set<string>> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState(false);
  const [assign, setAssign] = useState<{ staffId: string; roleId: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const current = draft ?? saved;
  const has = (m: Map<string, Set<string>>, roleId: string, p: string) => m.get(roleId)?.has(p) ?? false;
  const changes: RoleChange[] = ARM_ROLE_IDS.flatMap((roleId) => ARM_PERMISSION_KEYS.filter((p) => has(current, roleId, p) !== has(saved, roleId, p)).map((p) => ({ roleId, permission: p, on: has(current, roleId, p) })));
  const roleOf = (staffId: string, fallback: string) => assignments.find((a) => a.id === staffId)?.roleId ?? fallback;
  const roleName = (id: string) => {
    const r = bo.roles.find((x) => x.id === id);
    return r ? l(r.label) : id;
  };
  const flip = (roleId: string, p: ArmPermission, on: boolean) => {
    const next = new Map(current);
    next.set(roleId, toggle(current.get(roleId) ?? new Set(), p, on));
    setDraft(next);
    setNotice(false);
  };
  const open = (fn: () => void) => {
    fn();
    setDialogError(undefined);
    setNotice(false);
  };
  const run = async (p: Promise<ActionError | null>) => {
    setBusy(true);
    const failed = await p;
    setBusy(false);
    if (failed) return setDialogError(errorText(failed));
    setNotice(true);
    setConfirming(false);
    setAssign(null);
    setResetting(null);
    setDraft(null);
  };

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
      {notice && <output className="bo-saved">{t('savedNotice')}</output>}

      <div className="arm-columns bo-section">
        <section className="bo-card" aria-labelledby="arm-staff">
          <h2 id="arm-staff">{t('staffTitle')}</h2>
          <ul className="bo-list arm-wrap-list">
            {bo.staff.map((s) => {
              const roleId = roleOf(s.id, s.roleId);
              return (
                <li key={s.id} data-staff={s.id}>
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {l(s.title)} · {s.email}
                    </span>
                  </span>
                  {canManage ? (
                    <span className="arm-staff-role">
                      <SelectField
                        label={t('assignRole')}
                        ariaLabel={`${t('assignRole')}: ${s.name}`}
                        value={roleId}
                        onChange={(v) => open(() => setAssign({ staffId: s.id, roleId: v }))}
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
        <section className="bo-card" aria-labelledby="arm-roles">
          <h2 id="arm-roles">{t('rolesListTitle')}</h2>
          <ul className="bo-list arm-wrap-list">
            {roles.map((r) => {
              const rights = saved.get(r.id) ?? new Set<string>();
              const staffCount = bo.staff.filter((s) => roleOf(s.id, s.roleId) === r.id).length;
              const sensitive = [...rights].filter((p) => SENSITIVE.has(p as ArmPermission)).length;
              return (
                <li key={r.id} data-role={r.id}>
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{l(r.label)}</span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {l(r.description)}
                    </span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {fill(t('capabilities'), { n: rights.size, total: ARM_PERMISSION_KEYS.length })} · {fill(t('sensitiveCount'), { n: sensitive })} · {fill(t('staffCount'), { n: staffCount })}
                    </span>
                  </span>
                  {canManage && (
                    <button type="button" className="bo-btn ghost small" aria-label={`${t('resetRoleAction')}: ${l(r.label)}`} onClick={() => open(() => setResetting(r.id))}>
                      {t('resetRoleAction')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="bo-section" aria-labelledby="arm-matrix">
        <div className="bo-card-head" style={{ flexWrap: 'wrap' }}>
          <h2 id="arm-matrix" style={{ margin: 0 }}>
            {t('matrixTitle')}
          </h2>
          {canManage && (
            <span className="arm-head-actions">
              {changes.length > 0 && <span className="bo-muted">{fill(t('pendingChanges'), { n: changes.length })}</span>}
              <button
                type="button"
                className="bo-btn ghost small"
                onClick={() => {
                  setDraft(new Map(ARM_ROLE_IDS.map((id) => [id, new Set<string>(DEFAULT_ROLE_PERMISSIONS[id])])));
                  setNotice(false);
                }}
              >
                {t('defaultsMatrix')}
              </button>
              <button type="button" className="bo-btn ghost small" disabled={changes.length === 0} onClick={() => setDraft(null)}>
                {t('discardMatrix')}
              </button>
              <button type="button" className="bo-btn small" disabled={changes.length === 0} onClick={() => open(() => setConfirming(true))}>
                {t('saveMatrix')}
              </button>
            </span>
          )}
        </div>
        <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
          {canManage && `${t('matrixHint')} `}
          <span className="arm-tag" style={{ marginLeft: 0 }}>
            {t('sensitiveTag')}
          </span>{' '}
          — {t('sensitiveLegend')}
        </p>
        {/* Own scroll box (both axes) so the role headings stay visible while the rows scroll. Keyboard users reach every
            row through its checkboxes, which scroll into view when focused. */}
        <div className="bo-table-wrap arm-matrix-scroll" data-matrix-scroll>
          <table className="bo-table arm-matrix">
            <thead>
              <tr>
                <th scope="col">{t('colPermission')}</th>
                {roles.map((r) => (
                  <th key={r.id} scope="col" style={{ textAlign: 'center' }}>
                    {l(r.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <tr className="arm-matrix-group">
                    <th colSpan={roles.length + 1} scope="colgroup">
                      <span className="arm-matrix-group-label">{l(g.label)}</span>
                    </th>
                  </tr>
                  {g.items.map((item) => (
                    <tr key={item.key} data-permission={item.key}>
                      <td className="arm-matrix-name">
                        {l(item.label)}
                        {item.sensitive && <span className="arm-tag">{t('sensitiveTag')}</span>}
                        <span className="muted bo-sub">{item.key}</span>
                      </td>
                      {roles.map((r) => {
                        const lock = lockReason(r.id, item.key);
                        const on = has(current, r.id, item.key);
                        const changed = on !== has(saved, r.id, item.key);
                        return (
                          <td key={r.id} style={{ textAlign: 'center' }} className={changed ? 'arm-matrix-changed' : undefined}>
                            <input
                              type="checkbox"
                              className="arm-check"
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

      <section className="bo-section" aria-labelledby="arm-roles-history">
        <h2 id="arm-roles-history">{t('rolesHistory')}</h2>
        <EventTable events={events.filter((e) => e.entity.type === 'role' || e.entity.type === 'staff')} />
      </section>

      <ConfirmDialog
        open={confirming}
        title={t('confirmMatrix')}
        body={fill(t('confirmMatrixBody'), { n: changes.length })}
        confirmLabel={t('saveMatrix')}
        busy={busy}
        error={dialogError}
        onConfirm={() => void run(actions.saveRoleChanges(changes))}
        onCancel={() => setConfirming(false)}
      />
      <ConfirmDialog
        open={assign !== null}
        title={assign ? fill(t('confirmAssign'), { name: bo.staff.find((s) => s.id === assign.staffId)?.name ?? '', role: roleName(assign.roleId) }) : ''}
        body={t('confirmAssignBody')}
        confirmLabel={t('save')}
        busy={busy}
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
        busy={busy}
        error={dialogError}
        onConfirm={() => {
          if (resetting) void run(actions.resetRole(resetting));
        }}
        onCancel={() => setResetting(null)}
      />
    </>
  );
}
