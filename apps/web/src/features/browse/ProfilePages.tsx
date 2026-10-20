// First: configures @mmusic/core storage before the persisted profile-avatar / locale / demo-session stores are used.
import '@/platform/storage';

import { useMemo, useState, type ReactNode } from 'react';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { DemoStrings } from '@mmusic/core/demo/demo-strings';
import { formatKgsAmount } from '@mmusic/core/lib/format-currency';
import { manageReleasesLabel, qualityChangeToastLabel, removeDownloadAccessibilityLabel, removedFromDownloadsToast, type AppStringKey } from '@mmusic/core/lib/i18n';
import { groupSupportHistory, supportDateLabel, type SupportDateMode } from '@mmusic/core/lib/support-dates';
import { currentUser, getAlbumById, getArtistById } from '@mmusic/core/mocks';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useDemoSessionStore } from '@mmusic/core/state/demo-session-store';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import type { AppLocale } from '@mmusic/core/state/locale-store';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';
import { useProfileAvatarStore } from '@mmusic/core/state/profile-avatar-store';
import { useSettingsStore, type BooleanSettingKey, type QualitySettingKey, type StreamQuality } from '@mmusic/core/state/settings-store';
import { useSupportStore } from '@mmusic/core/state/support-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Backdrop } from '@/components/Backdrop';
import { useAppStrings } from '@/i18n/locale';
import { EmptyState, ListRow, Page, PageHeader } from '@/ui';

import { useBrowseToast, usePageTitle } from './shared';
import { useBrowseStrings } from './strings';

/* ----------------------------------------------- photo picker ----------------------------------------------- */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_MAX_PX = 800;

/** Same behaviour as the mobile web picker (lib/pick-cover-image.ts): validate, downscale to ≤800px JPEG data URL. */
async function downscaleToJpeg(file: File): Promise<string> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('decode failed'));
    el.src = src;
  });
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** S-23 Profile Hub (mobile: profile/index.tsx). */
export function ProfilePage() {
  const { t, locale } = useAppStrings();
  const ts = useBrowseStrings();
  const history = useSupportStore((s) => s.history);
  const myArtist = useArtistStore((s) => s.artist);
  const photoUri = useProfileAvatarStore((s) => s.photoUri);
  const setPhotoUri = useProfileAvatarStore((s) => s.setPhotoUri);
  const playlistsCount = usePlaylistsStore((s) => s.playlists.length);
  const { showToast, toast } = useBrowseToast();
  usePageTitle(t('profileTitle'));
  const total = history.reduce((sum, e) => sum + e.amount, 0);
  const artistsCount = new Set(history.map((e) => e.artistId)).size;
  const avatar: LocalOrRemoteImage | undefined = photoUri ?? currentUser.photoUri;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type.toLowerCase()) || file.size > PHOTO_MAX_BYTES) {
      showToast(ts('photoInvalid'), 'image');
      return;
    }
    try {
      setPhotoUri(await downscaleToJpeg(file));
      showToast(ts('photoUpdated'), 'check');
    } catch {
      showToast(ts('photoInvalid'), 'image');
    }
  };

  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('profileTitle')} />
      <div className="br-profile">
        <label className="br-avatar" title={t('changeProfilePhotoLabel')}>
          {avatar !== undefined ? (
            <Artwork source={avatar} alt={currentUser.name} loading="eager" />
          ) : (
            <span className="br-avatar-empty">
              <Icon name="person" size={44} />
            </span>
          )}
          <span className="br-avatar-edit" aria-hidden="true">
            <Icon name="edit" size={16} />
          </span>
          <input
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="visually-hidden"
            aria-label={t('changeProfilePhotoLabel')}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <div className="br-profile-text">
          <h2>
            {currentUser.name}
            {currentUser.verified && (
              <span className="br-verified secondary">
                <Icon name="verified" size={20} />
              </span>
            )}
          </h2>
          <p className="t-body-sm medium">
            @{currentUser.username} • {t('memberSince')} {currentUser.memberSinceYear}
          </p>
          <span className="br-vip">
            <Icon name="graphic-eq" size={14} />
            MBANK VIP SOUND
          </span>
        </div>
      </div>
      <div className="br-stats">
        <div>
          <span className="t-body-sm medium">{t('statSaved')}</span>
          <strong>{currentUser.savedCount}</strong>
        </div>
        <div>
          <span className="t-body-sm medium">{t('statPlaylists')}</span>
          <strong>{Math.max(currentUser.playlistsCount, playlistsCount)}</strong>
        </div>
        <div>
          <span className="t-body-sm medium">{t('statSupported')}</span>
          <strong>
            {formatKgsAmount(total)} <small>сом</small>
          </strong>
        </div>
      </div>
      <section aria-labelledby="br-sanct">
        <h2 id="br-sanct" className="br-h2">
          {t('studioSanctuary')}
        </h2>
        <div className="ui-list">
          <ListRow icon="settings" title={t('menuSettings')} subtitle={t('menuSettingsSubtitle')} to="/profile/settings" trail={<Icon name="chevron-right" size={20} />} />
          <ListRow icon="volunteer-activism" title={t('menuSupportHistory')} subtitle={`${formatKgsAmount(total)} сом ${t('supportedSuffix')} • ${artistsCount} ${t('artistsSuffix')}`} to="/profile/support-history" trail={<Icon name="chevron-right" size={20} />} />
          <ListRow
            icon="mic"
            title={myArtist ? t('menuArtistDashboard') : t('menuBecomeArtist')}
            subtitle={myArtist ? manageReleasesLabel(locale, myArtist.name) : t('becomeArtistSubtitle')}
            to={myArtist ? '/profile/artist/dashboard' : '/profile/artist/become-artist'}
            trail={<Icon name="chevron-right" size={20} />}
          />
        </div>
      </section>
      <section aria-labelledby="br-quick">
        <h2 id="br-quick" className="br-h2">
          {t('settingsTitle')}
        </h2>
        <SettingsRows />
      </section>
      {toast}
    </Page>
  );
}

/** The mobile Settings navigator rows (profile/settings.tsx); reused on the Profile hub for one-click access. */
function SettingsRows() {
  const { t, locale } = useAppStrings();
  const music = useSettingsStore((s) => s.musicStorageGb);
  const cache = useSettingsStore((s) => s.cacheGb);
  const downloaded = useLibraryStore((s) => s.downloadedIds.size);
  const demoActive = useDemoSessionStore((s) => s.active);
  const chevron = <Icon name="chevron-right" size={20} />;
  return (
    <div className="ui-list">
      <ListRow icon="language" title={t('appLanguage')} subtitle={locale === 'ru' ? t('appLanguageRussian') : t('appLanguageEnglish')} to="/profile/settings-language" trail={chevron} />
      <ListRow icon="high-quality" title={t('menuAudioQuality')} subtitle={t('settingsAudioSubtitle')} to="/profile/audio-quality" trail={chevron} />
      <ListRow icon="cloud-download" title={t('menuDownloads')} subtitle={`${(music + cache).toFixed(1)} GB ${t('usedSuffix')} • ${downloaded} ${t('downloadedSuffix')}`} to="/profile/downloads" trail={chevron} />
      <ListRow icon="verified-user" title={t('menuAccount')} subtitle={t('mbankConnectedId')} to="/profile/account" trail={chevron} />
      {demoActive && <ListRow icon="science" title={DemoStrings[locale].settingsRow} subtitle={DemoStrings[locale].settingsRowSignedIn} to="/profile/demo-account" trail={chevron} />}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useAppStrings();
  usePageTitle(t('settingsTitle'));
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('settingsTitle')} back="/profile" />
      <SettingsRows />
    </Page>
  );
}

const LANGS: { value: AppLocale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

/** App Language (mobile: profile/settings-language.tsx) — the shared persisted locale store, applied immediately. */
export function LanguagePage() {
  const { t, locale, setLocale } = useAppStrings();
  usePageTitle(t('appLanguage'));
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('appLanguage')} back="/profile/settings" />
      <div className="ui-list">
        {LANGS.map((o) => (
          <button key={o.value} type="button" aria-pressed={locale === o.value} lang={o.value} className="ui-row" onClick={() => setLocale(o.value)}>
            <span className="text">
              <span className="t-label-lg">{o.label}</span>
            </span>
            {locale === o.value && (
              <span className="br-accent">
                <Icon name="check" size={22} />
              </span>
            )}
          </button>
        ))}
      </div>
    </Page>
  );
}

/* ------------------------------------------- settings sections ------------------------------------------- */
const QUALITY_KEYS: Record<StreamQuality, AppStringKey> = { Low: 'qualityLowLabel', Normal: 'qualityNormalLabel', High: 'qualityHighLabel' };

function Card({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <section className="br-card">
      <h2 className="br-card-title">
        <Icon name={icon} size={18} />
        {title}
      </h2>
      <div className="ui-list">{children}</div>
    </section>
  );
}

function Toggle({ k, title, subtitle }: { k: BooleanSettingKey; title: string; subtitle?: string }) {
  const value = useSettingsStore((s) => s[k]);
  const setFlag = useSettingsStore((s) => s.setFlag);
  return (
    <label className="ui-row br-switch-row">
      <span className="text">
        <span className="t-label-lg">{title}</span>
        {subtitle && <span className="t-body-sm medium">{subtitle}</span>}
      </span>
      <input type="checkbox" role="switch" aria-checked={value} checked={value} onChange={(e) => setFlag(k, e.target.checked)} />
    </label>
  );
}

function Quality({ k, title, onChange }: { k: QualitySettingKey; title: string; onChange: (msg: string) => void }) {
  const { t, locale } = useAppStrings();
  const value = useSettingsStore((s) => s[k]);
  const cycle = useSettingsStore((s) => s.cycleQuality);
  return (
    <ListRow
      title={title}
      trail={
        <>
          {t(QUALITY_KEYS[value])}
          <Icon name="chevron-right" size={18} />
        </>
      }
      onClick={() => {
        const next = cycle(k);
        onChange(qualityChangeToastLabel(locale, title, t(QUALITY_KEYS[next])));
      }}
    />
  );
}

const Value = ({ title, value }: { title: string; value: string }) => <ListRow title={title} trail={value} />;

/** Audio Quality & Playback (mobile: profile/audio-quality.tsx) — session settings store. */
export function AudioQualityPage() {
  const { t } = useAppStrings();
  const crossfade = useSettingsStore((s) => s.crossfadeSec);
  const setCrossfade = useSettingsStore((s) => s.setCrossfade);
  const { showToast, toast } = useBrowseToast();
  usePageTitle(t('menuAudioQuality'));
  const notify = (m: string) => showToast(m, 'tune');
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('menuAudioQuality')} back="/profile/settings" />
      <p className="br-lede medium">{t('audioQualityIntroText')}</p>
      <Card title={t('sectionAudio')} icon="graphic-eq">
        <Toggle k="lossless" title={t('rowLossless')} subtitle={t('losslessSubtitle')} />
        <Quality k="wifiQuality" title={t('rowWifiQuality')} onChange={notify} />
        <Quality k="cellularQuality" title={t('rowCellularQuality')} onChange={notify} />
        <Toggle k="dolbyAtmos" title={t('rowDolbyAtmos')} subtitle={t('dolbyAtmosSubtitle')} />
        <Toggle k="volumeNormalization" title={t('rowVolumeNorm')} subtitle={t('volumeNormSubtitle')} />
      </Card>
      <Card title={t('sectionPlayback')} icon="tune">
        <div className="ui-row static">
          <span className="text">
            <span className="t-label-lg">{t('rowCrossfade')}</span>
          </span>
          <span className="br-stepper">
            <button type="button" className="icon-btn" aria-label={t('decreaseCrossfadeLabel')} disabled={crossfade <= 0} onClick={() => setCrossfade(crossfade - 1)}>
              <Icon name="remove" size={18} />
            </button>
            <span className="t-mono-num" aria-live="polite">
              {crossfade}s
            </span>
            <button type="button" className="icon-btn" aria-label={t('increaseCrossfadeLabel')} disabled={crossfade >= 12} onClick={() => setCrossfade(crossfade + 1)}>
              <Icon name="add" size={18} />
            </button>
          </span>
        </div>
        <Toggle k="gapless" title={t('rowGapless')} subtitle={t('gaplessSubtitle')} />
        <Value title={t('rowEqualizer')} value={t('equalizerFlatLabel')} />
      </Card>
      {toast}
    </Page>
  );
}

const LIKED_SONGS_ID = 'liked-songs';

/** Downloads & Offline (mobile: profile/downloads.tsx) — offline flags only; nothing is stored. */
export function DownloadsPage() {
  const { t, locale } = useAppStrings();
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const music = useSettingsStore((s) => s.musicStorageGb);
  const cache = useSettingsStore((s) => s.cacheGb);
  const clearCache = useSettingsStore((s) => s.clearCache);
  const { showToast, toast } = useBrowseToast();
  usePageTitle(t('menuDownloads'));
  const notify = (m: string) => showToast(m, 'tune');
  const entries = useMemo(
    () =>
      [...downloadedIds].flatMap((id) => {
        if (id === LIKED_SONGS_ID) return [{ id, title: t('likedSongs'), subtitle: t('autoPlaylistLabel'), cover: undefined, to: '/library/liked-songs' }];
        const p = playlists.find((pl) => pl.id === id);
        if (p) return [{ id, title: p.title, subtitle: `${t('playlistLabel')} • ${p.trackCount} ${p.trackCount === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`, cover: p.coverUri, to: `/playlist/${id}` }];
        const a = getAlbumById(id);
        if (a) return [{ id, title: a.title, subtitle: `${t('albumTypeAlbum')} • ${a.artistName}`, cover: a.coverUri, to: `/album/${id}` }];
        return [];
      }),
    [downloadedIds, playlists, t],
  );
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('menuDownloads')} back="/profile/settings" />
      <Card title={t('sectionDownloads')} icon="download">
        <Quality k="downloadQuality" title={t('rowDownloadQuality')} onChange={notify} />
        <Toggle k="downloadOverCellular" title={t('rowDownloadCellular')} subtitle={t('downloadCellularSubtitle')} />
        <Value title={t('rowStorageUsed')} value={`${(music + cache).toFixed(1)} GB • cache ${cache.toFixed(1)} GB`} />
        <ListRow
          title={t('rowClearCache')}
          trail={cache > 0 ? `${cache.toFixed(1)} GB` : '0 B'}
          onClick={() => {
            clearCache();
            showToast(t('toastCacheCleared'), 'cleaning-services');
          }}
        />
      </Card>
      <section className="br-card">
        <h2 className="br-card-title">
          <Icon name="download-done" size={18} />
          {`${t('downloadedMusicLabel')} (${entries.length})`}
        </h2>
        {entries.length === 0 ? (
          <EmptyState icon="download" title={t('nothingDownloadedHint')} />
        ) : (
          <div className="ui-list">
            {entries.map((e) => (
              <div key={e.id} className="br-dl-row">
                {e.cover !== undefined ? <ListRow art={e.cover} title={e.title} subtitle={e.subtitle} to={e.to} /> : <ListRow icon="favorite" title={e.title} subtitle={e.subtitle} to={e.to} />}
                <button
                  type="button"
                  className="icon-btn plain"
                  aria-label={removeDownloadAccessibilityLabel(locale, e.title)}
                  onClick={() => {
                    toggleDownloaded(e.id);
                    showToast(removedFromDownloadsToast(locale, e.title), 'download');
                  }}
                >
                  <Icon name="remove-circle-outline" size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="br-foot t-body-sm medium">{t('downloadsPreviewNote')}</p>
      {toast}
    </Page>
  );
}

/** Account & Security (mobile: profile/account.tsx) — demo account details. */
export function AccountPage() {
  const { t } = useAppStrings();
  const { showToast, toast } = useBrowseToast();
  usePageTitle(t('menuAccount'));
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('menuAccount')} back="/profile/settings" />
      <Card title={t('accountSectionLabel')} icon="person">
        <Value title={t('personNameLabel')} value={currentUser.name} />
        <Value title={t('usernameFieldLabel')} value={`@${currentUser.username}`} />
        <Value title={t('memberSince')} value={String(currentUser.memberSinceYear)} />
      </Card>
      <Card title={t('securitySectionLabel')} icon="verified-user">
        <Value title={t('mbankConnectedId')} value={t('connectedDemoLabel')} />
      </Card>
      <Card title={t('sectionAccount')} icon="account-balance">
        <Toggle k="fastPayAuth" title={t('rowFastPay')} subtitle={t('biometricActiveDemoLabel')} />
        <Toggle k="supportReceipts" title={t('rowSupportReceipts')} subtitle={t('supportReceiptsSubtitle')} />
      </Card>
      <p className="br-foot t-body-sm medium">{t('demoAccountNote')}</p>
      <button type="button" className="ui-btn ghost" onClick={() => showToast(t('toastSignOut'), 'logout')}>
        <Icon name="logout" size={18} />
        {t('logOut')}
      </button>
      {toast}
    </Page>
  );
}

const HISTORY_FILTERS = ['All', 'This Month'] as const;
const HISTORY_FILTER_KEYS: Record<(typeof HISTORY_FILTERS)[number], AppStringKey> = { All: 'filterAll', 'This Month': 'filterThisMonthLabel' };

/** S-22 Support History (mobile: profile/support-history.tsx) — the support store's local history. */
export function SupportHistoryPage() {
  const { t, locale } = useAppStrings();
  const history = useSupportStore((s) => s.history);
  const [filter, setFilter] = useState<(typeof HISTORY_FILTERS)[number]>('All');
  const [now] = useState(() => new Date());
  usePageTitle(t('menuSupportHistory'));
  const visible = useMemo(() => {
    if (filter === 'All') return history;
    return history.filter((e) => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [history, filter, now]);
  const total = history.reduce((s, e) => s + e.amount, 0);
  const creators = new Set(history.map((e) => e.artistId)).size;
  const mode: SupportDateMode = { kind: 'live', now };
  const grouped = groupSupportHistory(visible, mode, locale);
  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('menuSupportHistory')} back="/profile" />
      <div className="br-total">
        <span className="t-mono-num medium">{t('totalSupportedLabel')}</span>
        <strong>
          {formatKgsAmount(total)} <small>сом</small>
        </strong>
        <span className="medium">
          {t('directPatronageToPrefix')} {creators} {creators === 1 ? t('creatorSingular') : t('creatorPlural')}
        </span>
        <span className="ui-notice">{t('demoHistoryLabel')}</span>
      </div>
      <div className="ui-chips">
        {HISTORY_FILTERS.map((f) => (
          <button key={f} type="button" className={f === filter ? 'ui-chip on' : 'ui-chip'} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {t(HISTORY_FILTER_KEYS[f])}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon="volunteer-activism" title={t('noSupportHistoryTitle')} body={t('noSupportHistoryHint')} />
      ) : (
        grouped.map(([period, entries]) => (
          <section key={period} className="br-card">
            <h2 className="br-card-title">
              {period}
              <span className="medium">
                {entries.length} {entries.length === 1 ? t('grantSingular') : t('grantPlural')}
              </span>
            </h2>
            <div className="ui-list">
              {entries.map((e) => {
                const artist = getArtistById(e.artistId);
                const sub = `${formatKgsAmount(e.amount)} сом • ${t('completedStatusLabel')} • ${supportDateLabel(e.createdAt, mode, locale)}`;
                return artist ? <ListRow key={e.id} art={artist.photoUri} round title={artist.name} subtitle={sub} to={`/artist/${artist.id}`} trail={<Icon name="chevron-right" size={20} />} /> : <ListRow key={e.id} icon="person" title={t('unknownArtistLabel')} subtitle={sub} />;
              })}
            </div>
          </section>
        ))
      )}
    </Page>
  );
}
