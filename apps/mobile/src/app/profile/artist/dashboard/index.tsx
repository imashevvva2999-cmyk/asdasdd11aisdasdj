import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, EmptyState, Icon, IconButton, PillButton, PressableScale, StatCard } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { getArtistSupportTotalKgs } from '@/lib/artist-support-total';
import { formatKgsAmount } from '@/lib/format-currency';
import { usePlayerStore } from '@/state/player-store';
import { useArtistStore, type UploadStatus } from '@/state/artist-store';
import { useSupportStore } from '@/state/support-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';

const FILTERS = ['All', 'Published', 'In Review', 'Draft'] as const;

/** Status text colours from the Stitch release rows: published in the soft
 * flame tint, in-progress in gold, errors in the error red. */
const STATUS_COLOR: Record<UploadStatus, string> = {
  draft: Colors.text.medium,
  uploading: Colors.secondary,
  processing: Colors.secondary,
  published: Colors.tertiary,
  error: Colors.error,
};

const STATUS_LABEL: Record<UploadStatus, string> = {
  draft: 'Draft',
  uploading: 'Uploading',
  processing: 'Transcoding',
  published: 'Published',
  error: 'Error',
};

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
  const supportHistory = useSupportStore((s) => s.history);
  const play = usePlayerStore((s) => s.play);
  const { t } = useDashboardStrings();
  const navigation = useNavigation();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

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
    if (filter === 'All') return entries;
    if (filter === 'Published') return entries.filter((e) => e.status === 'published');
    if (filter === 'Draft') return entries.filter((e) => e.status === 'draft');
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

        <View style={styles.statsRow}>
          <StatCard label={t('listeners')} value={(artist.monthlyListeners ?? 0).toLocaleString('en-US')} icon="groups" iconColor={Colors.primary} />
          <StatCard label={t('streams')} value={(demoStreams ?? 0).toLocaleString('en-US')} icon="play-circle-outline" iconColor={Colors.tertiary} />
          <StatCard
            label={t('supportLabel')}
            value={`${formatKgsAmount(getArtistSupportTotalKgs(supportHistory, artist.id))} сом`}
            icon="volunteer-activism"
            iconColor={Colors.secondary}
          />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-md">{t('yourReleases')}</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((item) => (
              <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
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
                return (
                  <PressableScale
                    key={entry.track.id}
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
                          {inProgress ? STATUS_LABEL[entry.status] : `Single • ${STATUS_LABEL[entry.status]}`}
                        </ThemedText>
                      </View>
                      {published && (
                        <IconButton
                          icon="more-vert"
                          size={36}
                          color={Colors.text.medium}
                          accessibilityLabel="Track options"
                          style={styles.releaseMore}
                          onPress={() => router.push({ pathname: '/sheets/options', params: { kind: 'track', id: entry.track.id } })}
                        />
                      )}
                    </View>
                    {inProgress && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, entry.status === 'processing' && styles.progressFillAdvanced]} />
                      </View>
                    )}
                  </PressableScale>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
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
