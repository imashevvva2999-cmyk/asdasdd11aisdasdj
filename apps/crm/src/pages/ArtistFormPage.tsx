import { useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useCollection } from '@mmusic/backoffice/react';
import { BackLink, DemoBadge, EmptyState, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { useCrmActions } from '@/data/actions';
import { artistInput, type ArtistField, type ArtistInput } from '@/domain/artists';
import type { FieldErrors } from '@/domain/rules';
import type { CrmArtist, CrmContact } from '@/domain/types';
import { ArtistAvatar, SelectField, TextAreaField, TextField, useCrm } from '@/ui';

const AVATAR_SIZE = 160;

/** Reads an image file and returns a centred, square 160 px JPEG data URL (kept only in this browser). */
function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reject(new Error('type'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      canvas.getContext('2d')?.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('read'));
    };
    img.src = url;
  });
}

/** Create (/artists/new) or edit (/artists/:id/edit) a solo artist; permission crm.artists.edit. */
export function ArtistFormPage() {
  const { id } = useParams();
  const { t, fieldError, resultError } = useCrm();
  const navigate = useNavigate();
  const actions = useCrmActions();
  const fileId = useId();
  const existing = useCollection<CrmArtist>('artists').find((a) => a.id === id);
  const contacts = useCollection<CrmContact>('contacts');
  const [input, setInput] = useState<ArtistInput>(() => artistInput(existing));
  const [fields, setFields] = useState<FieldErrors<ArtistField>>({});
  const [error, setError] = useState<string>();
  const [avatarError, setAvatarError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const back = id ? <BackLink to={`/artists/${id}`} label={existing?.stageName ?? t('backToArtists')} /> : <BackLink to="/artists" label={t('backToArtists')} />;
  if (id && !existing) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('artistNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const set = (key: ArtistField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };
  const pick = async (file: File | undefined) => {
    setAvatarError(undefined);
    if (!file) return;
    try {
      set('avatar')(await toAvatar(file));
    } catch {
      setAvatarError(t('avatarReadError'));
    }
  };
  const submit = async () => {
    setBusy(true);
    const out = id ? await actions.updateArtist(id, input) : await actions.createArtist(input);
    setBusy(false);
    if (out.ok) return navigate(`/artists/${out.id}`);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };

  return (
    <>
      {back}
      <PageHeader title={id ? t('editArtist') : t('newArtist')} subtitle={existing?.stageName} actions={<DemoBadge />} />
      <form
        className="bo-card crm-form"
        aria-label={id ? t('editArtist') : t('newArtist')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        {!id && (
          <div style={{ marginBottom: 16 }}>
            <PermissionNote icon="science" text={t('newArtistHint')} />
          </div>
        )}
        <div className="bo-field crm-field">
          <label htmlFor={fileId}>{t('fieldAvatar')}</label>
          <div className="crm-name-cell" style={{ flexWrap: 'wrap' }}>
            <ArtistAvatar artist={{ id: id ?? 'new', stageName: input.stageName || '?', avatar: input.avatar || undefined }} size={64} />
            <input id={fileId} type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={`${fileId}-hint`} onChange={(e) => void pick(e.target.files?.[0])} style={{ height: 'auto', padding: 8, flex: '1 1 220px' }} />
            {input.avatar && (
              <button type="button" className="bo-btn ghost small" onClick={() => set('avatar')('')}>
                {t('avatarRemove')}
              </button>
            )}
          </div>
          {avatarError || fields.avatar ? (
            <span id={`${fileId}-hint`} className="bo-field-error" role="alert">
              {avatarError ?? fieldError(fields.avatar)}
            </span>
          ) : (
            <span id={`${fileId}-hint`} className="bo-field-hint">
              {t('avatarHint')}
            </span>
          )}
        </div>
        <div className="crm-form-grid">
          <TextField label={t('fieldStageName')} required value={input.stageName} onChange={set('stageName')} error={fieldError(fields.stageName)} />
          <TextField label={t('fieldLegalName')} value={input.legalName} onChange={set('legalName')} error={fieldError(fields.legalName)} hint={t('fieldLegalNameHint')} />
          <TextField label={t('fieldGenres')} required value={input.genres} onChange={set('genres')} error={fieldError(fields.genres)} hint={t('fieldGenresHint')} />
          <TextField label={t('fieldCity')} required value={input.city} onChange={set('city')} error={fieldError(fields.city)} />
          <TextField label={t('fieldArtistEmail')} type="email" value={input.email} onChange={set('email')} error={fieldError(fields.email)} placeholder="name@example.kg" />
          <TextField label={t('fieldArtistPhone')} type="tel" value={input.phone} onChange={set('phone')} error={fieldError(fields.phone)} placeholder="+996 555 000 0xx" />
          <SelectField
            label={t('fieldManager')}
            value={input.managerContactId}
            onChange={set('managerContactId')}
            error={fieldError(fields.managerContactId)}
            hint={t('fieldManagerHint')}
            options={[{ value: '', label: t('none') }, ...[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <TextAreaField label={t('fieldNotes')} value={input.notes} onChange={set('notes')} error={fieldError(fields.notes)} />
        {error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
            {t('save')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => navigate(id ? `/artists/${id}` : '/artists')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </>
  );
}
