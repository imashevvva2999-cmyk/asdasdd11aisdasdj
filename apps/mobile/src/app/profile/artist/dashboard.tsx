import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, Chip, EmptyState, IconButton, PillButton, StatCard, TrackRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/state/player-store';
import { useArtistStore, type UploadStatus } from '@/state/artist-store';

const FILTERS = ['All', 'Published', 'In Review', 'Draft'] as const;

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
  const play = usePlayerStore((s) => s.play);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

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
          title="No artist profile yet"
          hint="Set up your artist profile to start uploading tracks."
          actionLabel="Become an Artist"
          onActionPress={() => router.push('/profile/artist/become-artist')}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <PillButton label="Upload Track" leadingIcon="upload" onPress={() => router.push('/profile/artist/upload-track')} style={styles.uploadButton} />
          <IconButton
            icon="person"
            accessibilityLabel="View public artist profile"
            onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Listeners" value={String(artist.monthlyListeners ?? 0)} icon="person" />
          <StatCard label="Streams" value="0" icon="graphic-eq" />
          <StatCard label="Support" value="0 сом" icon="volunteer-activism" />
        </View>

        <View style={styles.section}>
          <ThemedText variant="headline-sm">Your Releases</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((item) => (
              <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
            ))}
          </ScrollView>

          {visibleEntries.length === 0 ? (
            <EmptyState
              icon="upload"
              title={entries.length === 0 ? 'Upload your first track' : 'Nothing in this filter yet'}
              hint={entries.length === 0 ? 'Published and draft tracks will appear here.' : undefined}
              actionLabel={entries.length === 0 ? 'Upload Track' : undefined}
              onActionPress={entries.length === 0 ? () => router.push('/profile/artist/upload-track') : undefined}
            />
          ) : (
            <View style={styles.trackList}>
              {visibleEntries.map((entry) => (
                <View key={entry.track.id} style={styles.trackEntry}>
                  <TrackRow
                    title={entry.track.title}
                    artist={artist.name}
                    explicit={entry.track.explicit}
                    onPress={entry.status === 'published' ? () => play(entry.track.id) : undefined}
                  />
                  <View style={styles.trackMeta}>
                    <Badge
                      label={STATUS_LABEL[entry.status]}
                      variant={entry.status === 'published' ? 'lossless' : 'neutral'}
                      style={entry.status === 'error' ? styles.errorBadge : undefined}
                    />
                    {(entry.status === 'uploading' || entry.status === 'processing') && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, entry.status === 'processing' && styles.progressFillAdvanced]} />
                      </View>
                    )}
                  </View>
                </View>
              ))}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadButton: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  trackList: {
    gap: Spacing.sm,
  },
  trackEntry: {
    gap: 4,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 56,
  },
  errorBadge: {
    backgroundColor: 'rgba(255, 75, 75, 0.18)',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface.l3,
    overflow: 'hidden',
    maxWidth: 120,
  },
  progressFill: {
    width: '35%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  progressFillAdvanced: {
    width: '70%',
  },
});
