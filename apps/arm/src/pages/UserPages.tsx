import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection, useRole } from '@mmusic/backoffice/react';
import { checkReason, TRANSITION_ERROR_LABELS } from '@mmusic/backoffice/review';
import { BackLink, ConfirmDialog, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { useArmCan } from '@/access';
import { useArmActions } from '@/data/actions';
import type { DemoArtist, DemoUser, UserRole, UserStatus } from '@/domain/types';
import { fill, type ArmStringKey } from '@/strings';
import { EventTable, maskEmail, matches, UserStatusBadge, useArm, useQueryState } from '@/ui';

const ROLE_KEYS: Record<UserRole, ArmStringKey> = { listener: 'roleListener', artist: 'roleArtist', staff: 'roleStaff' };

/** Fictional accounts with masked e-mail: search, role and status filters. */
export function UsersPage() {
  const { t, date } = useArm();
  const users = useCollection<DemoUser>('users');
  const query = useQueryState();
  const q = query.get('q');
  const role = query.get('role');
  const status = query.get('status');
  const rows = users
    .filter((u) => (!role || u.role === role) && (!status || u.status === status) && (!q || matches(`${u.name} ${u.email}`, q)))
    .sort((a, b) => Number(b.status === 'suspended') - Number(a.status === 'suspended') || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title={t('usersTitle')} subtitle={t('usersSubtitle')} actions={<DemoBadge />} />
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: users.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchUsers')} />
        <FilterSelect label={t('filterRole')} value={role} onChange={(v) => query.set('role', v)} options={[{ value: '', label: '—' }, ...(Object.keys(ROLE_KEYS) as UserRole[]).map((r) => ({ value: r, label: t(ROLE_KEYS[r]) }))]} />
        <FilterSelect label={t('filterAccount')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, { value: 'active', label: t('statusActive') }, { value: 'suspended', label: t('statusSuspended') }]} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colName')}</th>
                <th>{t('colEmail')}</th>
                <th>{t('colRole')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colRegistered')}</th>
                <th>{t('colLastActive')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link className="bo-link" to={`/users/${u.id}`}>
                      {u.name}
                    </Link>
                  </td>
                  <td className="muted">{maskEmail(u.email)}</td>
                  <td className="muted">{t(ROLE_KEYS[u.role])}</td>
                  <td>
                    <UserStatusBadge status={u.status} />
                  </td>
                  <td className="muted nowrap">{date(u.registeredAt)}</td>
                  <td className="muted nowrap">{date(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function UserDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date, roleLabel, errorText } = useArm();
  const bo = useBackoffice();
  const actions = useArmActions();
  const users = useCollection<DemoUser>('users');
  const artists = useCollection<DemoArtist>('artists');
  const events = useCollection<ActivityEvent>('activity');
  const allowed = useArmCan('arm.users.edit');
  const role = useRole();
  const [target, setTarget] = useState<UserStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return (
      <>
        <BackLink to="/users" label={t('backToUsers')} />
        <EmptyState icon="search-off" title={t('userNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const staff = bo.staff.find((s) => s.id === user.staffId);
  const artist = artists.find((a) => a.id === user.artistId);
  const next: UserStatus = user.status === 'active' ? 'suspended' : 'active';
  const open = () => {
    setTarget(next);
    setReason('');
    setReasonError(undefined);
    setError(undefined);
    setSaved(false);
  };
  const confirm = async () => {
    if (!target) return;
    const invalid = checkReason(reason, target === 'suspended');
    if (invalid) return setReasonError(l(TRANSITION_ERROR_LABELS[invalid]));
    setBusy(true);
    const failed = await actions.changeUserStatus(user.id, target, reason);
    setBusy(false);
    if (failed) return setError(errorText(failed));
    setTarget(null);
    setSaved(true);
  };
  const details: [string, ReactNode][] = [
    [t('fieldEmail'), maskEmail(user.email)],
    [t('fieldRole'), t(ROLE_KEYS[user.role])],
    ...(staff ? ([[t('fieldStaffRole'), roleLabel(staff.roleId)]] as [string, ReactNode][]) : []),
    ...(artist ? ([[t('fieldLinkedArtist'), <Link key="a" className="bo-link" to={`/artists/${artist.id}`}>{artist.name}</Link>]] as [string, ReactNode][]) : []),
    [t('fieldCity'), user.city],
    [t('fieldRegistered'), date(user.registeredAt)],
    [t('fieldLastActive'), date(user.lastActiveAt)],
    [t('fieldStatus'), <UserStatusBadge key="s" status={user.status} />],
    ...(user.statusReason ? ([[t('fieldStatusReason'), <p key="r" className="bo-quote" style={{ margin: 0 }}>{user.statusReason}</p>]] as [string, ReactNode][]) : []),
  ];

  return (
    <>
      <BackLink to="/users" label={t('backToUsers')} />
      <PageHeader
        title={user.name}
        subtitle={staff ? l(staff.title) : t(ROLE_KEYS[user.role])}
        actions={
          <>
            <UserStatusBadge status={user.status} />
            <DemoBadge />
          </>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <section className="bo-card" aria-label={t('accountTitle')}>
          <h2>{t('accountTitle')}</h2>
          {user.role === 'staff' ? (
            <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
              {t('staffAccountHint')}
            </p>
          ) : (
            <>
              <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
                {t('accountHint')}
              </p>
              <div className="bo-actions">
                <button type="button" className={next === 'suspended' ? 'bo-btn small danger' : 'bo-btn small'} disabled={!allowed} onClick={open}>
                  {next === 'suspended' ? t('suspend') : t('reactivate')}
                </button>
              </div>
              {!allowed && <p className="bo-field-error">{fill(t('viewOnlyRole'), { role: role ? l(role.label) : '—' })}</p>}
            </>
          )}
          {saved && (
            <output className="bo-saved">{t('savedNotice')}</output>
          )}
          <PermissionNote />
        </section>
      </div>
      <section className="bo-section" aria-label={t('historyTitle')}>
        <h2>{t('historyTitle')}</h2>
        <EventTable events={events.filter((e) => e.entity.id === user.id)} showEntity={false} />
      </section>
      <ConfirmDialog
        open={target !== null}
        title={fill(t(target === 'suspended' ? 'confirmSuspend' : 'confirmReactivate'), { title: user.name })}
        body={t('accountHint')}
        confirmLabel={target === 'suspended' ? t('suspend') : t('reactivate')}
        danger={target === 'suspended'}
        reason={target ? { required: target === 'suspended', value: reason, onChange: (v) => (setReason(v), setReasonError(undefined)), error: reasonError } : undefined}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
