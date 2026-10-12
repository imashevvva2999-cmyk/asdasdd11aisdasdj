import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, PillButton, PressableScale, TextField, ToggleRow } from '@/components/ui';
import { sampleImageChoices } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { useLibraryStore } from '@/state/library-store';
import { useAppStrings } from '@/state/locale-store';
import { usePlaylistsStore } from '@/state/playlists-store';

const NAME_MAX_LENGTH = 50;

/**
 * S-14 Create Playlist — shared route (Library "+", or "New Playlist" inside
 * the Add to Playlist sheet — docs/screens.md §2, OQ-19). "Add Cover" and
 * "Color Wave" use SIMULATED image selection (cycling local sample images —
 * no native image picker is a dependency yet), the same approach Upload
 * Track's "Browse File" uses. "AI Generate" stays unavailable: whether AI
 * covers are in the MVP is still OQ-24, so it says so instead of faking it.
 * A created playlist is also added to the Library so it's visible there.
 */
export default function CreatePlaylistScreen() {
  const { initialTrackId } = useLocalSearchParams<{ initialTrackId?: string }>();
  const createPlaylist = usePlaylistsStore((s) => s.createPlaylist);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const { showToast, toast } = useToast();
  const { t } = useAppStrings();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [coverIndex, setCoverIndex] = useState<number | null>(null);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0;
  const coverUri = coverIndex === null ? undefined : sampleImageChoices[coverIndex];

  function pickNextCover(message: string) {
    if (sampleImageChoices.length === 0) return;
    setCoverIndex((current) => (current === null ? 0 : (current + 1) % sampleImageChoices.length));
    showToast(message, 'image');
  }

  function handleCreate() {
    if (!canCreate) return;
    const playlist = createPlaylist({
      title: trimmedName,
      description: description.trim() || undefined,
      coverUri,
      isPublic,
      isCollaborative,
      initialTrackId,
    });
    toggleSaved('playlist', playlist.id);
    goBack();
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <View style={styles.header}>
        <ThemedText variant="label-lg" emphasis="medium" accessibilityRole="button" onPress={() => goBack()}>
          {t('cancel')}
        </ThemedText>
        <ThemedText variant="headline-sm">{t('createPlaylistLabel')}</ThemedText>
        <ThemedText
          variant="label-lg"
          emphasis={canCreate ? 'primary' : 'medium'}
          accessibilityRole="button"
          aria-disabled={!canCreate}
          onPress={canCreate ? handleCreate : undefined}
        >
          {t('createShortLabel')}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverBlock}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('addCoverLabel')}
            onPress={() => pickNextCover(t('toastSampleCoverSelected'))}
          >
            {coverUri ? (
              <Artwork uri={coverUri} size={192} radius={20} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <View style={styles.coverIconCircle}>
                  <Icon name="add-photo-alternate" size={24} color={Colors.primary} />
                </View>
                <ThemedText variant="label-md" style={styles.coverHint}>
                  {t('addCoverLabel')}
                </ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">
                  {t('customArtOrPhotoHint')}
                </ThemedText>
              </View>
            )}
          </PressableScale>
          <View style={styles.coverActions}>
            <CoverActionChip
              icon="auto-awesome"
              label={t('aiGenerateLabel')}
              onPress={() => showToast(t('toastAiCoversUnavailable'), 'auto-awesome')}
            />
            <CoverActionChip icon="gradient" label={t('colorWaveLabel')} onPress={() => pickNextCover(t('toastColorWaveApplied'))} />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <ThemedText variant="label-md" emphasis="primary">
              {t('nameFieldLabel')}
            </ThemedText>
            <ThemedText variant="mono-num" emphasis="medium">
              {name.length}/{NAME_MAX_LENGTH}
            </ThemedText>
          </View>
          <TextField
            accessibilityLabel={t('nameFieldLabel')}
            placeholder={t('playlistNamePlaceholder')}
            value={name}
            onChangeText={(text) => setName(text.slice(0, NAME_MAX_LENGTH))}
            maxLength={NAME_MAX_LENGTH}
          />
        </View>

        <View style={styles.field}>
          <ThemedText variant="label-md" emphasis="primary">
            {t('descriptionFieldLabel')} <ThemedText variant="label-md" emphasis="medium">{t('optionalSuffixLabel')}</ThemedText>
          </ThemedText>
          <TextField
            accessibilityLabel={t('descriptionOptionalAccessibility')}
            placeholder={t('vibePlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleIcon}>
            <Icon name="public" size={20} color={Colors.primary} />
          </View>
          <ToggleRow
            title={t('publicPlaylistLabel')}
            subtitle={t('publicPlaylistSubtitle')}
            value={isPublic}
            onValueChange={setIsPublic}
            style={styles.toggleRow}
          />
        </View>
        <View style={styles.toggleCard}>
          <View style={[styles.toggleIcon, styles.toggleIconSecondary]}>
            <Icon name="group-add" size={20} color={Colors.secondary} />
          </View>
          <ToggleRow
            title={t('collaborativeLabel')}
            subtitle={t('collaborativeSubtitle')}
            value={isCollaborative}
            onValueChange={setIsCollaborative}
            style={styles.toggleRow}
          />
        </View>

        <PillButton label={t('createPlaylistLabel')} disabled={!canCreate} onPress={handleCreate} style={styles.cta} />
      </ScrollView>
      {toast}
    </ThemedView>
  );
}

function CoverActionChip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { t } = useAppStrings();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${label} ${t('coverSuffixWord')}`} onPress={onPress} style={styles.coverChip}>
      <Icon name={icon} size={14} color={Colors.primary} />
      <ThemedText variant="label-sm">{label}</ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.margin,
  },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  coverBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coverPlaceholder: {
    width: 192,
    height: 192,
    borderRadius: 20,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  coverIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHint: {
    marginTop: Spacing.sm,
  },
  coverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface.l1,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 75, 75, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconSecondary: {
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  toggleRow: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  coverActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    gap: 6,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
