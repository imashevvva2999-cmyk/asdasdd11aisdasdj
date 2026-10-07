import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Icon, IconButton, PillButton, PressableScale, TextField, ToggleRow } from '@/components/ui';
import { sampleImageChoices } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import { goBack } from '@/lib/navigation';
import { useLibraryStore } from '@/state/library-store';
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
        <ThemedText variant="label-lg" emphasis="primary" accessibilityRole="button" onPress={() => goBack()}>
          Cancel
        </ThemedText>
        <ThemedText variant="headline-sm">Create Playlist</ThemedText>
        <ThemedText
          variant="label-lg"
          emphasis={canCreate ? 'primary' : 'medium'}
          accessibilityRole="button"
          aria-disabled={!canCreate}
          onPress={canCreate ? handleCreate : undefined}
        >
          Create
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverBlock}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Add cover"
            onPress={() => pickNextCover('Sample cover selected (demo — no photo picker yet)')}
          >
            {coverUri ? (
              <Artwork uri={coverUri} size={160} radius={Radii.lg} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Icon name="add-photo-alternate" size={28} color={Colors.text.medium} />
                <ThemedText variant="body-sm" emphasis="medium" style={styles.coverHint}>
                  Add Cover
                </ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">
                  Custom art or photo
                </ThemedText>
              </View>
            )}
          </PressableScale>
          <View style={styles.coverActions}>
            <IconButton
              icon="auto-awesome"
              accessibilityLabel="AI Generate cover"
              onPress={() => showToast("AI-generated covers aren't available yet", 'auto-awesome')}
            />
            <IconButton icon="gradient" accessibilityLabel="Color Wave cover" onPress={() => pickNextCover('Color Wave cover applied')} />
          </View>
        </View>

        <View style={styles.field}>
          <TextField
            placeholder="Name"
            value={name}
            onChangeText={(text) => setName(text.slice(0, NAME_MAX_LENGTH))}
            maxLength={NAME_MAX_LENGTH}
            rightAccessory={
              <ThemedText variant="mono-num" emphasis="medium">
                {name.length}/{NAME_MAX_LENGTH}
              </ThemedText>
            }
          />
        </View>

        <View style={styles.field}>
          <TextField
            placeholder="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <ToggleRow title="Public Playlist" value={isPublic} onValueChange={setIsPublic} />
        <ToggleRow title="Collaborative" value={isCollaborative} onValueChange={setIsCollaborative} />

        <PillButton label="Create Playlist" disabled={!canCreate} onPress={handleCreate} style={styles.cta} />
      </ScrollView>
      {toast}
    </ThemedView>
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
    width: 160,
    height: 160,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface.l2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  coverHint: {
    marginTop: Spacing.xs,
  },
  coverActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
