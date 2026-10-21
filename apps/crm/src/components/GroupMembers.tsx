import { useState } from 'react';
import { Link } from 'react-router';

import { useCollection } from '@mmusic/backoffice/react';
import { ConfirmDialog } from '@mmusic/backoffice/ui';

import { useCrmCan } from '@/access';
import { useCrmActions, type ActionResult } from '@/data/actions';
import type { MemberField } from '@/domain/artists';
import type { FieldErrors } from '@/domain/rules';
import type { CrmArtist, CrmOrganization } from '@/domain/types';
import { fill } from '@/strings';
import { ArtistAvatar, SelectField, TextField, useCrm, ViewOnly } from '@/ui';

/**
 * Members of a music group (unified CRM): each member is a reference to an artist record with a role in the group.
 * Adding, changing a role and removing need crm.organizations.edit and go to the group's change log.
 */
export function GroupMembers({ group }: { group: CrmOrganization }) {
  const { t, fieldError, resultError } = useCrm();
  const actions = useCrmActions();
  const canEdit = useCrmCan('crm.organizations.edit');
  const canArtists = useCrmCan('crm.artists.view');
  const canNewArtist = useCrmCan('crm.artists.edit');
  const artists = useCollection<CrmArtist>('artists');
  const [artistId, setArtistId] = useState('');
  const [role, setRole] = useState('');
  const [fields, setFields] = useState<FieldErrors<MemberField>>({});
  const [editing, setEditing] = useState<{ artistId: string; role: string } | null>(null);
  const [editError, setEditError] = useState<string>();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const members = group.members ?? [];
  const free = artists.filter((a) => !members.some((m) => m.artistId === a.id)).sort((a, b) => a.stageName.localeCompare(b.stageName));
  const nameOf = (id: string) => artists.find((a) => a.id === id)?.stageName ?? id;
  const failed = (out: ActionResult<MemberField>) => (out.ok ? undefined : out.error === 'invalid' ? fieldError(out.fields.role ?? out.fields.artistId) : resultError(out));

  const add = async () => {
    setBusy(true);
    const out = await actions.addMember(group.id, artistId, role);
    setBusy(false);
    if (!out.ok) {
      setError(out.error === 'invalid' ? undefined : resultError(out));
      return setFields(out.error === 'invalid' ? out.fields : {});
    }
    setArtistId('');
    setRole('');
    setFields({});
    setError(undefined);
  };
  const saveRole = async () => {
    if (!editing) return;
    const out = await actions.changeMemberRole(group.id, editing.artistId, editing.role);
    if (!out.ok && out.error !== 'same-status') return setEditError(failed(out));
    setEditing(null);
    setEditError(undefined);
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    const out = await actions.removeMember(group.id, removing);
    setBusy(false);
    if (!out.ok) return setError(resultError(out));
    setRemoving(null);
  };

  return (
    <section className="bo-card bo-section" aria-labelledby="group-members">
      <h2 id="group-members">{t('membersTitle')}</h2>
      <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        {t('membersHint')}
      </p>
      {members.length === 0 ? (
        <p className="bo-muted">{t('noMembers')}</p>
      ) : (
        <ul className="bo-list crm-wrap-list">
          {members.map((m) => {
            const artist = artists.find((a) => a.id === m.artistId);
            return (
              <li key={m.artistId} data-member={m.artistId}>
                {artist && <ArtistAvatar artist={artist} size={36} />}
                <span className="grow">
                  {canArtists ? (
                    <Link className="bo-link bo-ellipsis" to={`/artists/${m.artistId}`}>
                      {nameOf(m.artistId)}
                    </Link>
                  ) : (
                    <span className="bo-ellipsis">{nameOf(m.artistId)}</span>
                  )}
                  <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                    {fill(t('roleInGroup'), { role: m.role })}
                  </span>
                </span>
                {canEdit && editing?.artistId === m.artistId ? (
                  <span className="crm-head-actions" style={{ flex: '1 1 260px' }}>
                    <span style={{ flex: '1 1 140px' }}>
                      <TextField label={`${t('memberRole')}: ${nameOf(m.artistId)}`} value={editing.role} onChange={(v) => setEditing({ artistId: m.artistId, role: v })} error={editError} />
                    </span>
                    <button type="button" className="bo-btn small" onClick={() => void saveRole()}>
                      {t('saveRole')}
                    </button>
                    <button type="button" className="bo-btn ghost small" onClick={() => setEditing(null)}>
                      {t('cancel')}
                    </button>
                  </span>
                ) : (
                  canEdit && (
                    <span className="crm-row-actions">
                      <button type="button" className="bo-btn ghost small" aria-label={`${t('memberRole')}: ${nameOf(m.artistId)}`} onClick={() => (setEditing({ artistId: m.artistId, role: m.role }), setEditError(undefined))}>
                        {t('edit')}
                      </button>
                      <button type="button" className="bo-btn ghost small" aria-label={`${t('removeMemberAction')}: ${nameOf(m.artistId)}`} onClick={() => (setRemoving(m.artistId), setError(undefined))}>
                        {t('removeMemberAction')}
                      </button>
                    </span>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit ? (
        free.length === 0 ? (
          <p className="bo-muted" style={{ fontSize: 13, marginBottom: 0 }}>
            {t('noFreeArtists')}
          </p>
        ) : (
          <form
            className="crm-member-row"
            aria-label={t('addMember')}
            style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void add();
            }}
          >
            <SelectField label={t('memberArtist')} value={artistId} onChange={(v) => (setArtistId(v), setFields((f) => ({ ...f, artistId: undefined })))} error={fieldError(fields.artistId)} options={[{ value: '', label: '—' }, ...free.map((a) => ({ value: a.id, label: a.stageName }))]} />
            <TextField label={t('memberRole')} value={role} onChange={(v) => (setRole(v), setFields((f) => ({ ...f, role: undefined })))} error={fieldError(fields.role)} placeholder={t('memberRolePlaceholder')} />
            <div className="bo-field">
              <button type="submit" className="bo-btn" disabled={busy}>
                {t('addMember')}
              </button>
            </div>
          </form>
        )
      ) : (
        <ViewOnly />
      )}
      {error && (
        <p className="bo-field-error" role="alert">
          {error}
        </p>
      )}
      {canEdit && canNewArtist && (
        <p style={{ margin: '12px 0 0', fontSize: 13 }}>
          <Link className="bo-link" to="/artists/new">
            {t('createArtistLink')}
          </Link>
        </p>
      )}
      <ConfirmDialog
        open={removing !== null}
        title={removing ? fill(t('confirmRemoveMember'), { name: nameOf(removing) }) : ''}
        body={t('confirmRemoveMemberBody')}
        confirmLabel={t('removeMemberAction')}
        danger
        busy={busy}
        error={error}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
