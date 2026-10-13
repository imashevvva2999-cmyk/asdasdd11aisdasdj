import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Badge, Chip, EmptyState, Icon, IconButton, PillButton, PressableScale, StatCard, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getArtistSupportTotalKgs } from '@/lib/artist-support-total';
import { getTrackAnalytics } from '@/lib/analytics-mock';
import { formatKgsAmount } from '@/lib/format-currency';
import { usePlayerStore } from '@/state/player-store';
import { useArtistStore, type UploadStatus } from '@/state/artist-store';
import { useSupportStore } from '@/state/support-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import type { DashboardStringKey } from '@/lib/dashboard-i18n';
import { DEMO_FAN_DONATIONS, DEMO_RECENT_ACTIVITY, getDemoAccountMetrics } from '@/mocks/demo-artist-account';

const FILTERS = ['filterAll', 'filterPublished', 'filterInReview', 'filterDraft'] as const satisfies readonly DashboardStringKey[];

/** Status text colours from the Stitch release rows: published in the soft
 * flame tint, in-progress in gold, errors in the error red. */
const STATUS_COLOR: Record<UploadStatus, string> = {
  draft: Colors.text.medium,
  uploading: Colors.secondary,
  processing: Colors.secondary,
  published: Colors.tertiary,
  error: Colors.error,
};

const STATUS_LABEL: Record<UploadStatus, DashboardStringKey> = {
  draft: 'statusDraft',
  uploading: 'statusUploading',
  processing: 'statusProcessing',
  published: 'statusPublished',
  error: 'statusError',
};

function relativeDay(daysAgo: number, t: (k: DashboardStringKey) => string): string {
  if (daysAgo <= 0) return t('today');
  if (daysAgo === 1) return t('yesterday');
  return `${daysAgo} ${t('daysAgoSuffix')}`;
}

/**
 * S-27 Artist Dashboard — UF-14 step 3 (docs/screens.md). Same Artist entity
 * as the public S-08 Artist Profile — a plain stack screen in the existing
 * Mmusic navigation, no Studio tab bar / Overview / Analytics / Catalog /
 * Payouts (out of scope — OQ-51). Stats shown are clearly local/mock, not
 * real analytics: a brand-new local artist genuinely has 0 listeners/streams
 * until something changes that state, so 0 is the honest value, not a
 * placeholder.
 */
export default function ArtistDashboardScreen() {
  const artist = useArtistStore((s) => s.artist);
  const entries = useArtistStore((s) => s.entries);
  const demoStreams = useArtistStore((s) => s.demoStreams);
  const demoListeners = useArtistStore((s) => s.demoListeners);
  const supportHistory = useSupportStore((s) => s.history);
  const play = usePlayerStore((s) => s.play);
  const demoAccount = useArtistStore((s) => s.demoAccount);
  const campaigns = useArtistStore((s) => s.campaigns);
  const loadDemoAccount = useArtistStore((s) => s.loadDemoAccount);
  const { t, locale } = useDashboardStrings();
  const navigation = useNavigation();
  const publishedEntries = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);
  const metrics = useMemo(
    () => (demoAccount ? getDemoAccountMetrics(publishedEntries.map((e) => e.track.id)) : undefined),
    [demoAccount, publishedEntries],
  );
  const topTrack = useMemo(() => {
    if (!demoAccount || publishedEntries.length === 0) return undefined;
    return publishedEntries.reduce((best, e) => {
      const streams = getTrackAnalytics(e.track.id, 'all').streams;
      return streams > getTrackAnalytics(best.track.id, 'all').streams ? e : best;
    });
  }, [demoAccount, publishedEntries]);
  const promoSpendKgs = campaigns.reduce((sum, c) => sum + c.budgetKgs, 0);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('filterAll');

  useEffect(() => {
    if (!artist) return;
    // Overview lives inside the dashboard's own Tabs navigator (headerShown: false);
    // the public-profile button must reach the parent profile Stack's header instead.
    const parent = navigation.getParent();
    if (!parent) return;
    parent.setOptions({
      headerRight: () => (
        <IconButton
          icon="person"
          size={40}
          accessibilityLabel="View public artist profile"
          onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
        />
      ),
    });
    return () => {
      parent.setOptions({ headerRight: undefined });
    };
  }, [artist, navigation]);

  const visibleEntries = useMemo(() => {
    if (filter === 'filterAll') return entries;
    if (filter === 'filterPublished') return entries.filter((e) => e.status === 'published');
    if (filter === 'filterDraft') return entries.filter((e) => e.status === 'draft');
    return entries.filter((e) => e.status === 'uploading' || e.status === 'processing');
  }, [entries, filter]);

  if (!artist) {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <EmptyState
          icon="mic"
          title={t('noArtistTitle')}
          hint={t('noArtistHint')}
          actionLabel={t('becomeArtistAction')}
          onActionPress={() => router.push('/profile/artist/become-artist')}
        />
        {/* Dev builds only (demo preview): one-tap fully populated demo account. */}
        {__DEV__ && <TextLinkButton label={t('loadDemoAccount')} onPress={loadDemoAccount} style={styles.demoLink} />}
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {entries.length > 0 && (
          <PillButton
            label={t('uploadTrack')}
            leadingIcon="add-circle-outline"
            onPress={() => router.push('/profile/artist/upload-track')}
            style={styles.uploadButton}
          />
        )}

        {demoAccount && (
          <View style={styles.profileCard}>
            <Artwork shape="circle" size={64} radius={32} uri={artist.photoUri} placeholderIcon="person" />
            <View style={styles.profileText}>
              <View style={styles.profileNameRow}>
                <ThemedText variant="headline-sm" numberOfLines={1}>{artist.name}</ThemedText>
                <Icon name="verified" size={18} color={Colors.text.medium} />
                <Badge label={t('demoAccountBadge')} />
              </View>
              <ThemedText variant="body-sm" emphasis="medium" numberOfLines={2}>{artist.bio}</ThemedText>
              {metrics && (
                <ThemedText variant="label-md" style={{ color: Colors.primary }}>
                  {metrics.followers.toLocaleString('en-US')} {t('followersLabel').toLowerCase()}
                </ThemedText>
              )}
            </View>
          </View>
        )}
        {demoStreams !== undefined && <Badge label={t('demoDataBadge')} style={styles.demoBadge} />}
        <View style={styles.statsRow}>
          <StatCard
            label={t('listeners')}
            value={(demoListeners ?? artist.monthlyListeners ?? 0).toLocaleString('en-US')}
            icon="groups"
            iconColor={Colors.primary}
            trend={metrics ? `+${metrics.listenersDeltaPct}%` : undefined}
          />
          <StatCard
            label={t('streams')}
            value={(demoStreams ?? 0).toLocaleString('en-US')}
            icon="play-circle-outline"
            iconColor={Colors.tertiary}
            trend={metrics ? `+${metrics.streamsDeltaPct}%` : undefined}
          />
          <StatCard
            label={t('supportLabel')}
            value={`${formatKgsAmount(getArtistSupportTotalKgs(supportHistory, artist.id) + (metrics?.fanDonationsKgs ?? 0))} сом`}
            icon="volunteer-activism"
            iconColor={Colors.secondary}
          />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('yourReleases')}</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((item) => (
              <Chip key={item} label={t(item)} selected={item === filter} onPress={() => setFilter(item)} />
            ))}
          </ScrollView>

          {visibleEntries.length === 0 ? (
            <EmptyState
              icon="upload"
              title={entries.length === 0 ? t('uploadFirstTrackTitle') : t('emptyFilterTitle')}
              hint={entries.length === 0 ? t('uploadFirstTrackHint') : undefined}
              actionLabel={entries.length === 0 ? t('uploadTrack') : undefined}
              onActionPress={entries.length === 0 ? () => router.push('/profile/artist/upload-track') : undefined}
            />
          ) : (
            <View style={styles.trackList}>
              {visibleEntries.map((entry) => {
                const inProgress = entry.status === 'uploading' || entry.status === 'processing';
                const published = entry.status === 'published';
                // The ⋮ button sits OUTSIDE the pressable row (a button nested in a
                // button is invalid HTML and trips React's dev overlay on web); a
                // same-size spacer keeps the row layout pixel-identical.
                return (
                  <View key={entry.track.id} style={styles.releaseItem}>
                  <PressableScale
                    accessibilityRole={published ? 'button' : undefined}
                    disabled={!published}
                    onPress={published ? () => play(entry.track.id) : undefined}
                    style={styles.releaseCard}
                  >
                    <View style={styles.releaseRow}>
                      {inProgress ? (
                        <View style={styles.releaseCoverPending}>
                          <Icon name="sync" size={24} color={Colors.secondary} />
                        </View>
                      ) : (
                        <Artwork uri={entry.track.coverUri} size={48} radius={Radii.DEFAULT} />
                      )}
                      <View style={styles.releaseText}>
                        <ThemedText variant="label-lg" numberOfLines={1}>
                          {entry.track.title}
                        </ThemedText>
                        <ThemedText variant="body-sm" numberOfLines={1} style={{ color: STATUS_COLOR[entry.status] }}>
                          {inProgress ? t(STATUS_LABEL[entry.status]) : `${t('singleLabel')} • ${t(STATUS_LABEL[entry.status])}`}
                        </ThemedText>
                      </View>
                      {published && <View style={styles.releaseMoreSlot} />}
                    </View>
                    {inProgress && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, entry.status === 'processing' && styles.progressFillAdvanced]} />
                      </View>
                    )}
                  </PressableScale>
                  {published && (
                    <View pointerEvents="box-none" style={styles.releaseMoreOverlay}>
                      <IconButton
                        icon="more-vert"
                        size={36}
                        color={Colors.text.medium}
                        accessibilityLabel={t('trackOptions')}
                        style={styles.releaseMore}
                        onPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: entry.track.id } })}
                      />
                    </View>
                  )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {metrics && topTrack && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <ThemedText variant="headline-sm" style={styles.flexText}>{t('topTrackSection')}</ThemedText>
              <Badge label={t('demoDataBadge')} />
            </View>
            <View style={styles.activityRow}>
              <Artwork uri={topTrack.track.coverUri} size={48} radius={Radii.DEFAULT} />
              <View style={styles.flexText}>
                <ThemedText variant="label-lg" numberOfLines={1}>{topTrack.track.title}</ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">
                  {getTrackAnalytics(topTrack.track.id, 'all').streams.toLocaleString('en-US')} {t('streamsWord')}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {metrics && (
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <ThemedText variant="headline-sm" style={styles.flexText}>{t('revenueSection')}</ThemedText>
                <Badge label={t('demoDataBadge')} />
              </View>
              <InfoLine label={t('streamingRoyalties')} value={`${formatKgsAmount(metrics.royaltiesKgs)} сом`} />
              <InfoLine label={t('fanDonations')} value={`${formatKgsAmount(metrics.fanDonationsKgs)} сом`} />
              <InfoLine label={t('promoSpend')} value={`−${formatKgsAmount(promoSpendKgs)} сом`} />
            </View>

            <View style={styles.infoCard}>
              <ThemedText variant="headline-sm">{t('recentDonations')}</ThemedText>
              {DEMO_FAN_DONATIONS.slice(0, 4).map((d) => (
                <InfoLine key={`${d.from}-${d.daysAgo}`} label={`${d.from} · ${relativeDay(d.daysAgo, t)}`} value={`+${formatKgsAmount(d.amountKgs)} сом`} />
              ))}
            </View>

            <View style={styles.infoCard}>
              <ThemedText variant="headline-sm">{t('recentActivity')}</ThemedText>
              {DEMO_RECENT_ACTIVITY.map((a) => (
                <View key={a.text.en} style={styles.activityRow}>
                  <Icon name={a.icon} size={20} color={Colors.text.medium} />
                  <ThemedText variant="body-sm" style={styles.flexText}>{a.text[locale]}</ThemedText>
                  <ThemedText variant="body-sm" emphasis="medium">{relativeDay(a.daysAgo, t)}</ThemedText>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <ThemedText variant="body-sm" emphasis="medium" style={styles.flexText} numberOfLines={1}>{label}</ThemedText>
      <ThemedText variant="label-lg">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  uploadButton: {
    borderRadius: Radii.md,
  },
  demoLink: { alignSelf: 'center', marginBottom: Spacing.xl },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md },
  profileText: { flex: 1, minWidth: 0, gap: 4 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  infoCard: { backgroundColor: Colors.surface.l1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flexText: { flex: 1, minWidth: 0 },
  demoBadge: {
    alignSelf: 'flex-start',
    marginBottom: -Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  trackList: {
    gap: Spacing.sm,
  },
  releaseCard: {
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  releaseCoverPending: {
    width: 48,
    height: 48,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  releaseMore: {
    backgroundColor: 'transparent',
  },
  releaseItem: {
    position: 'relative',
  },
  releaseMoreSlot: {
    width: 36,
    height: 36,
  },
  releaseMoreOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    bottom: Spacing.sm,
    right: Spacing.sm,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '35%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.secondary,
  },
  progressFillAdvanced: {
    width: '70%',
  },
});
