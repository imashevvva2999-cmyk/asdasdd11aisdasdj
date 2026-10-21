import { formatNumber } from '@mmusic/backoffice/i18n';
import { useBackoffice, useLocale, useLocalized, useT } from '@mmusic/backoffice/react';
import { DemoBadge, KpiCard, PageHeader } from '@mmusic/backoffice/ui';
import { albums, artists, genres, playlists, tracks } from '@mmusic/core/mocks';

import { ARM_STRINGS } from '@/strings';

/**
 * ARM dashboard (M1): only what the foundation can honestly show — counts of the app's public demo-catalog
 * metadata, the fictional team with their provisional roles, and the roadmap. Moderation queues, payments and
 * campaign figures arrive with their milestones (no invented numbers).
 */
export function DashboardPage() {
  const t = useT(ARM_STRINGS);
  const locale = useLocale();
  const l = useLocalized();
  const bo = useBackoffice();
  const n = (value: number) => formatNumber(value, locale);
  const roleName = (roleId: string) => {
    const role = bo.roles.find((r) => r.id === roleId);
    return role ? l(role.label) : roleId;
  };

  return (
    <>
      <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')} />

      <section className="bo-section" aria-labelledby="arm-catalog">
        <h2 id="arm-catalog">{t('catalogTitle')}</h2>
        <div className="bo-grid">
          <KpiCard icon="mic" label={t('artists')} value={n(artists.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="album" label={t('albums')} value={n(albums.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="music-note" label={t('tracks')} value={n(tracks.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="category" label={t('genres')} value={n(genres.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="queue-music" label={t('playlists')} value={n(playlists.length)} hint={t('catalogHint')} demo />
        </div>
      </section>

      <div className="bo-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="bo-card" aria-labelledby="arm-team">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 id="arm-team" style={{ margin: 0, font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' }}>
              {t('teamTitle')}
            </h2>
            <DemoBadge />
          </div>
          <ul className="bo-list">
            {bo.staff.map((member) => (
              <li key={member.id}>
                <span className="grow">
                  <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                    {member.name}
                  </span>
                  <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                    {l(member.title)} · {member.email}
                  </span>
                </span>
                <span className="bo-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  {roleName(member.roleId)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bo-card" aria-labelledby="arm-roadmap">
          <h2 id="arm-roadmap" style={{ margin: '0 0 8px', font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' }}>
            {t('roadmapTitle')}
          </h2>
          <ul className="bo-list">
            {(['roadmapM2', 'roadmapM3', 'roadmapM6'] as const).map((key) => (
              <li key={key} className="bo-muted">
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
