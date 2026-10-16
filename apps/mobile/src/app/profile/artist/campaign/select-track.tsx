import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { S, SR, SS, SText, StitchHeader, alpha, sf, usePromoStrings } from '@/components/promotion-stitch';
import { SelectTrackPromoStrings } from '@/components/promotion-stitch/strings/select-track';
import { Artwork, EmptyState, Icon, PressableScale } from '@/components/ui';
import { InteractionPromoStrings } from '@/components/promotion-stitch/strings/interactions';
import { useToast } from '@/hooks/use-toast';
import type { TrackId } from '@/mocks';
import { goBack } from '@/lib/navigation';
import { useArtistStore } from '@/state/artist-store';
import { useCampaignStore } from '@/state/campaign-store';
import { useDashboardStrings } from '@/state/dashboard-locale-store';
import { useAppStrings } from '@/state/locale-store';

function formatDuration(durationSec: number) {
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Campaign wizard step 1/4 — Stitch "Choose Music To Promote" (screen 2),
 * reproduced 1:1. Picks the published track the rest of the flow targets;
 * selection is only committed to campaign-store on Continue, so backing out
 * never leaves a half-started campaign. */
export default function SelectTrackScreen() {
  const { t } = useDashboardStrings();
  const { t: tApp } = useAppStrings();
  const s = usePromoStrings(SelectTrackPromoStrings);
  const insets = useSafeAreaInsets();
  const { showToast, toast } = useToast();
  const artist = useArtistStore((st) => st.artist);
  const entries = useArtistStore((st) => st.entries);
  const startCampaign = useCampaignStore((st) => st.startCampaign);
  const draftTrackId = useCampaignStore((st) => st.trackId);
  const si = usePromoStrings(InteractionPromoStrings);
  const published = useMemo(() => entries.filter((e) => e.status === 'published'), [entries]);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedId, setSelectedId] = useState<TrackId | undefined>(
    published.some((e) => e.track.id === draftTrackId) ? draftTrackId : published[0]?.track.id,
  );
  const [tab, setTab] = useState<'tracks' | 'albums' | 'profile'>('tracks');
  const albumCount = artist?.releaseAlbumIds?.length ?? 0;

  const filtered = useMemo(
    () => published.filter((e) => e.track.title.toLowerCase().includes(query.trim().toLowerCase())),
    [published, query],
  );

  const selectedTrack = published.find((e) => e.track.id === selectedId)?.track;

  return (
    <View style={styles.root}>
      <StitchHeader title={s.title} onBack={() => goBack('/profile/artist/dashboard/promotion')} backLabel={tApp('backLabel')} />

      <View style={styles.progressBlock}>
        <View style={styles.progressRow}>
          <SText v="label-md" weight="600" color={S.primary} style={styles.stepLabel}>
            {s.step}
          </SText>
          <SText v="mono-num" color={S.outline}>
            {s.progress}
          </SText>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[S.primary, S.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.progressFill} />
        </View>
      </View>

      {published.length === 0 ? (
        <EmptyState icon="library-music" title={t('noPublishedTracksTitle')} hint={t('noPublishedTracksBody')} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 144 + insets.bottom }} showsVerticalScrollIndicator={false}>
            <View style={styles.subtitleBlock}>
              <SText v="body-md" color={S.outline} style={styles.subtitle}>
                {s.subtitle}
              </SText>
            </View>

            <View style={styles.tabsBlock}>
              <View style={styles.tabs}>
                {(
                  [
                    ['tracks', `${s.tabTracks} (${published.length})`],
                    ['albums', `${s.tabAlbums.replace(/\s*\(\d+\)$/, '')} (${albumCount})`],
                    ['profile', s.tabProfile],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === key }}
                    style={[styles.tab, tab === key && styles.tabActive]}
                    onPress={() => setTab(key)}
                  >
                    <SText v="label-md" weight={tab === key ? '600' : undefined} color={tab === key ? S.onSurface : S.outline}>
                      {label}
                    </SText>
                  </Pressable>
                ))}
              </View>
            </View>

            {tab !== 'profile' && (
            <View style={styles.searchBlock}>
              <View style={styles.searchIcon} pointerEvents="none">
                <Icon name="search" size={20} color={S.outline} />
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={s.search}
                placeholderTextColor={S.outline}
                style={[styles.searchInput, focused && styles.searchInputFocused]}
              />
              {query.length > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel={s.clearSearch} onPress={() => setQuery('')} style={styles.clearBtn}>
                  <Icon name="close" size={18} color={S.outline} />
                </Pressable>
              )}
            </View>
            )}

            <View style={styles.list}>
              {tab === 'albums' && albumCount === 0 && (
                <SText v="body-md" color={S.outline} style={styles.albumsEmpty}>
                  {si.albumsEmpty}
                </SText>
              )}
              {tab === 'tracks' && filtered.map((entry) => {
                const selected = entry.track.id === selectedId;
                const year = new Date(entry.createdAt).getFullYear();
                return (
                  <PressableScale
                    key={entry.track.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedId(entry.track.id)}
                    style={[styles.item, selected ? styles.itemSelected : styles.itemIdle]}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.coverWrap, selected && styles.coverGlow]}>
                        <Artwork uri={entry.track.coverUri} size={56} radius={SR.lg} />
                        {selected && (
                          <>
                            <LinearGradient
                              colors={[alpha(S.surfaceContainerLowest, 0.6), 'transparent']}
                              start={{ x: 0, y: 1 }}
                              end={{ x: 0, y: 0 }}
                              style={StyleSheet.absoluteFill}
                              pointerEvents="none"
                            />
                            <View style={styles.eq} pointerEvents="none">
                              <View style={[styles.eqBar, { height: 12 }]} />
                              <View style={[styles.eqBar, { height: 6 }]} />
                              <View style={[styles.eqBar, { height: 8 }]} />
                            </View>
                          </>
                        )}
                      </View>
                      <View style={styles.itemText}>
                        <SText v="headline-sm" weight="600" numberOfLines={1} style={styles.itemTitle}>
                          {entry.track.title}
                        </SText>
                        <SText v="body-sm" color={S.outline} numberOfLines={1}>
                          {s.single}{entry.genre ? ` • ${entry.genre}` : ''} • {year} • {entry.track.durationSec !== undefined ? formatDuration(entry.track.durationSec) : '—'}
                        </SText>
                      </View>
                    </View>
                    {selected ? (
                      <View style={[styles.indicator, styles.indicatorOn]}>
                        <Icon name="check" size={16} color={S.onPrimaryContainer} />
                      </View>
                    ) : (
                      <View style={[styles.indicator, styles.indicatorOff]} />
                    )}
                  </PressableScale>
                );
              })}

              {artist && tab !== 'albums' && (
                <PressableScale accessibilityRole="radio" accessibilityState={{ selected: false }} onPress={() => showToast(si.profileToast)} style={[styles.item, styles.itemIdle]}>
                  <View style={styles.itemLeft}>
                    <View style={styles.profileAvatar}>
                      <Artwork uri={artist.photoUri} size={56} shape="circle" radius={28} placeholderIcon="person" />
                    </View>
                    <View style={styles.itemText}>
                      <View style={styles.profileTitleRow}>
                        <SText v="headline-sm" weight="600" numberOfLines={1} style={styles.profileTitle}>
                          {s.artistProfile} {artist.name}
                        </SText>
                        <Icon name="verified" size={16} color={S.primary} />
                      </View>
                      <SText v="body-sm" color={S.outline} numberOfLines={1}>
                        {s.artistProfileHint}
                      </SText>
                    </View>
                  </View>
                  <View style={[styles.indicator, styles.indicatorOff]} />
                </PressableScale>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: SS.margin + insets.bottom }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <View style={styles.dot} />
                <SText v="body-sm" numberOfLines={1} style={styles.summaryText}>
                  {s.selected}{' '}
                  <SText v="body-sm" weight="600" color={S.primary}>
                    {selectedTrack?.title ?? '—'}
                  </SText>
                  <SText v="body-sm" color={S.outline}>
                    {' '}• {s.single}
                  </SText>
                </SText>
              </View>
              <SText v="mono-num" color={S.outline} style={styles.stepShort}>
                {s.stepShort}
              </SText>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedId }}
              disabled={!selectedId}
              onPress={() => {
                if (!selectedId) return;
                startCampaign(selectedId);
                router.push('/profile/artist/campaign/select-package');
              }}
              style={[styles.cta, !selectedId && styles.ctaDisabled]}
            >
              <SText v="headline-sm" weight="700" color={S.onPrimaryContainer}>
                {s.continue}
              </SText>
              <Icon name="arrow-forward" size={20} color={S.onPrimaryContainer} />
            </PressableScale>
          </View>
        </>
      )}
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  albumsEmpty: { textAlign: 'center', paddingVertical: SS.lg },
  root: { flex: 1, backgroundColor: S.surface },
  progressBlock: { paddingHorizontal: SS.margin, paddingTop: SS.md, paddingBottom: SS.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SS.xs },
  stepLabel: { textTransform: 'uppercase', letterSpacing: 0.05 * 12 },
  progressTrack: { height: 6, width: '100%', backgroundColor: S.surfaceContainer, borderRadius: SR.full, overflow: 'hidden' },
  progressFill: { height: '100%', width: '25%', borderRadius: SR.full },
  subtitleBlock: { paddingHorizontal: SS.margin, marginBottom: SS.md },
  subtitle: { lineHeight: 19 },
  tabsBlock: { paddingHorizontal: SS.margin, marginBottom: SS.md },
  tabs: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: SR.xl, backgroundColor: S.surfaceContainerLow },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: SS.xs, borderRadius: SR.lg, alignItems: 'center', justifyContent: 'center' },
  tabActive: {
    backgroundColor: S.surfaceContainerHighest,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.05,
  },
  searchBlock: { paddingHorizontal: SS.margin, marginBottom: SS.lg, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: SS.margin + 14, zIndex: 1 },
  searchInput: {
    height: 44,
    paddingLeft: 44,
    paddingRight: 40,
    borderRadius: SR.xl,
    backgroundColor: S.surfaceContainerLow,
    color: S.onSurface,
    fontFamily: sf('body', '400'),
    fontSize: 14,
  },
  searchInputFocused: { backgroundColor: S.surfaceContainer },
  clearBtn: { position: 'absolute', right: SS.margin + 12, zIndex: 1 },
  list: { paddingHorizontal: SS.margin, gap: SS.sm },
  item: { borderRadius: SR.xl, padding: SS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  itemIdle: { backgroundColor: S.surfaceContainerLow },
  itemSelected: {
    backgroundColor: S.surfaceContainer,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: SS.md, flex: 1, minWidth: 0, paddingRight: 8 },
  coverWrap: { width: 56, height: 56, borderRadius: SR.lg, overflow: 'hidden', backgroundColor: S.surfaceContainerHigh },
  coverGlow: {
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
  },
  eq: { position: 'absolute', bottom: 4, right: 4, height: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  eqBar: { width: 2, borderRadius: SR.full, backgroundColor: S.primary },
  itemText: { flex: 1, minWidth: 0 },
  itemTitle: { marginBottom: 2 },
  indicator: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  indicatorOn: {
    backgroundColor: S.primaryContainer,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.5,
  },
  indicatorOff: { backgroundColor: S.surfaceContainerHighest },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: S.surfaceContainerHigh },
  profileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  profileTitle: { flexShrink: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingTop: SS.margin,
    paddingHorizontal: SS.margin,
    backgroundColor: alpha(S.surfaceContainerLowest, 0.9),
    gap: SS.sm,
    shadowColor: S.black,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 32,
    shadowOpacity: 0.7,
    elevation: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SS.xs },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S.primaryContainer },
  summaryText: { flexShrink: 1 },
  stepShort: { letterSpacing: 0.05 * 11, flexShrink: 0, marginLeft: SS.sm },
  cta: {
    height: 56,
    width: '100%',
    borderRadius: SR.full,
    backgroundColor: S.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.4 },
});
