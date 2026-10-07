import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, EmptyState, StatCard } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getArtistById, type SupportHistoryEntry } from '@/mocks';
import { useSupportStore } from '@/state/support-store';

const FILTERS = ['All', 'This Month'] as const;

/**
 * S-22 Support History (docs/screens.md §3.12). Local/mock donation history
 * only — no real transaction retrieval. The "Zero Platform Fees • 100% to
 * Artists" / "MBANK Instant Settlement Secured" banner from the Stitch
 * design is intentionally omitted: OQ-10 (donation commission/business
 * model) is unresolved, and docs/open-questions.md explicitly notes that
 * copy is mockup text, not a confirmed business model.
 */
export default function SupportHistoryScreen() {
  const history = useSupportStore((s) => s.history);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const visibleHistory = useMemo(() => {
    if (filter === 'All') return history;
    const now = new Date();
    return history.filter((entry) => {
      const date = new Date(entry.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [history, filter]);

  const totalSupported = history.reduce((sum, entry) => sum + entry.amount, 0);
  const distinctArtistCount = new Set(history.map((entry) => entry.artistId)).size;
  const grouped = groupByPeriod(visibleHistory);

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Total Supported" value={`${totalSupported} сом`} icon="volunteer-activism" />
          <StatCard label="Artists Supported" value={String(distinctArtistCount)} icon="groups" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => (
            <Chip key={item} label={item} selected={item === filter} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        {visibleHistory.length === 0 ? (
          <EmptyState
            icon="volunteer-activism"
            title="You haven't supported any artists yet"
            hint="Open an artist's profile and tap Support to send direct patronage."
          />
        ) : (
          Object.entries(grouped).map(([period, entries]) => (
            <View key={period} style={styles.group}>
              <ThemedText variant="label-md" emphasis="medium" style={styles.groupTitle}>
                {period}
              </ThemedText>
              <View style={styles.entries}>
                {entries.map((entry) => (
                  <SupportHistoryRow key={entry.id} entry={entry} />
                ))}
              </View>
            </View>
          ))
        )}

        <ThemedText variant="body-sm" emphasis="medium" style={styles.footer}>
          MBANK Direct Creator Network
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function SupportHistoryRow({ entry }: { entry: SupportHistoryEntry }) {
  const artist = getArtistById(entry.artistId);
  const date = new Date(entry.createdAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.row}>
      <Artwork shape="circle" size={40} radius={20} />
      <View style={styles.rowText}>
        <ThemedText
          variant="label-lg"
          numberOfLines={1}
          onPress={artist ? () => router.push({ pathname: '/artist/[id]', params: { id: artist.id } }) : undefined}
        >
          {artist?.name ?? 'Unknown artist'}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          Direct patronage • {dateLabel}, {timeLabel}
        </ThemedText>
      </View>
      <View style={styles.rowAmount}>
        <ThemedText variant="label-lg">{entry.amount} сом</ThemedText>
        <ThemedText variant="body-sm" style={styles.statusLabel}>
          Completed
        </ThemedText>
      </View>
    </View>
  );
}

function groupByPeriod(entries: SupportHistoryEntry[]): Record<string, SupportHistoryEntry[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, SupportHistoryEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    let label: string;
    if (date >= startOfToday) {
      label = 'Today';
    } else if (date >= startOfWeek) {
      label = 'Last Week';
    } else {
      label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    (groups[label] ??= []).push(entry);
  }
  return groups;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  group: {
    gap: Spacing.sm,
  },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  entries: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.l1,
    borderRadius: 16,
    padding: Spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowAmount: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusLabel: {
    color: Colors.secondary,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
