import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Artwork, Chip, Icon, PillButton, TextField, TextLinkButton, Toast, ToggleRow } from '@/components/ui';
import { sampleImageChoices } from '@/constants/stitch-artwork';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { useArtistStore } from '@/state/artist-store';

const GENRE_OPTIONS = ['Electronic', 'Ambient', 'Synthwave', 'Indie', 'Dream Pop', 'Neo-Classical', 'Hip-Hop', 'Pop', 'Rock', 'Jazz', 'Lo-Fi'];

/** A fixed mock duration standing in for real file metadata — no audio is
 * decoded in this preview (see the "simulated file selection" note below). */
const MOCK_FILE_DURATION_SEC = 204;

/**
 * S-28 Upload Track — UF-14 step 4 (docs/screens.md, incomplete design —
 * publishing states beyond the input form are undesigned, OQ-50). Frontend
 * state only: no real upload, transcoding, moderation, or catalog ingestion.
 *
 * File/cover picker: this uses SIMULATED local file selection rather than a
 * real native document/image picker (expo-document-picker /
 * expo-image-picker are not current dependencies, and there is no
 * simulator/device available in this environment to validate a newly added
 * native picker's actual platform behavior — per the batch instructions,
 * the simulated UI is the safer choice here, reported explicitly).
 */
export default function UploadTrackScreen() {
  const saveDraft = useArtistStore((s) => s.saveDraft);
  const publishTrack = useArtistStore((s) => s.publishTrack);
  const simulateError = useArtistStore((s) => s.simulateError);
  const retryPublish = useArtistStore((s) => s.retryPublish);
  const entries = useArtistStore((s) => s.entries);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  // Simulated picker (no native image picker is installed) — cycles the bundled
  // sample covers, mirroring "Browse File" above.
  const [coverIndex, setCoverIndex] = useState<number | null>(null);
  const coverUri = coverIndex === null ? undefined : sampleImageChoices[coverIndex];
  const [title, setTitle] = useState('');
  const [collaborators, setCollaborators] = useState('');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [explicit, setExplicit] = useState(false);
  const [releaseMode, setReleaseMode] = useState<'now' | 'schedule'>('now');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [draftSavedToastVisible, setDraftSavedToastVisible] = useState(false);

  const activeEntry = useMemo(() => entries.find((e) => e.track.id === activeTrackId), [entries, activeTrackId]);

  const canPublish = title.trim().length > 0 && selectedFileName !== null;
  const isBusy = activeEntry?.status === 'uploading' || activeEntry?.status === 'processing';

  function handleBrowseFile() {
    setSelectedFileName('midnight-session-master.wav');
  }

  function buildDraft() {
    return saveDraft({
      title: title.trim(),
      genre,
      explicit,
      durationSec: MOCK_FILE_DURATION_SEC,
      coverUri,
    });
  }

  async function handlePublish() {
    if (!canPublish) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    await publishTrack(entry.track.id);
  }

  function handleSaveAsDraft() {
    if (title.trim().length === 0) return;
    buildDraft();
    setDraftSavedToastVisible(true);
    setTimeout(() => {
      setDraftSavedToastVisible(false);
      goBack('/profile/artist/dashboard');
    }, 900);
  }

  function handleSimulateError() {
    if (!canPublish) return;
    const entry = buildDraft();
    setActiveTrackId(entry.track.id);
    simulateError(entry.track.id);
  }

  if (activeEntry?.status === 'published') {
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <View style={styles.resultContainer}>
          <View style={styles.resultIconHalo}>
            <Icon name="check-circle" size={40} color={Colors.secondary} />
          </View>
          <ThemedText variant="headline-md" style={styles.centerText}>
            Track Published
          </ThemedText>
          <ThemedText variant="body-md" emphasis="medium" style={styles.centerText}>
            &quot;{activeEntry.track.title}&quot; is now live on your artist profile.
          </ThemedText>
          <PillButton
            label="View Public Profile"
            onPress={() => {
              // Leave Upload Track first so Back from the public profile lands on the Dashboard.
              router.dismissTo('/profile/artist/dashboard');
              router.push({ pathname: '/artist/[id]', params: { id: activeEntry.track.artistId } });
            }}
            style={styles.resultButton}
          />
          <TextLinkButton label="Back to Dashboard" onPress={() => goBack('/profile/artist/dashboard')} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText variant="label-md" emphasis="medium" style={styles.sectionTitle}>
            Upload Audio
          </ThemedText>
          {selectedFileName ? (
            <View style={styles.filePreview}>
              <Icon name="graphic-eq" size={24} color={Colors.primary} />
              <View style={styles.fileInfo}>
                <ThemedText variant="label-lg" numberOfLines={1}>
                  {selectedFileName}
                </ThemedText>
                <ThemedText variant="body-sm" emphasis="medium">
                  {formatDuration(MOCK_FILE_DURATION_SEC)}
                </ThemedText>
              </View>
              <TextLinkButton label="Change" onPress={handleBrowseFile} disabled={isBusy} />
            </View>
          ) : (
            <PillButton label="Browse File" variant="secondary" leadingIcon="folder-open" onPress={handleBrowseFile} />
          )}
        </View>

        <View style={styles.section}>
          <ThemedText variant="label-md" emphasis="medium" style={styles.sectionTitle}>
            Track Details
          </ThemedText>
          <View style={styles.field}>
            <TextField placeholder="Title" value={title} onChangeText={setTitle} editable={!isBusy} />
          </View>
          <View style={styles.field}>
            <TextField placeholder="Featured Collaborators (Optional)" value={collaborators} onChangeText={setCollaborators} editable={!isBusy} />
          </View>
          <View style={styles.chipGrid}>
            {GENRE_OPTIONS.map((option) => (
              <Chip key={option} label={option} selected={genre === option} disabled={isBusy} onPress={() => setGenre((g) => (g === option ? undefined : option))} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="label-md" emphasis="medium" style={styles.sectionTitle}>
            Cover Artwork
          </ThemedText>
          <View style={styles.coverRow}>
            <Artwork size={64} radius={Radii.md} uri={coverUri} />
            <PillButton
              label={coverUri ? 'Change Cover' : 'Choose Cover'}
              variant="secondary"
              onPress={() => setCoverIndex((index) => (index === null ? 0 : (index + 1) % sampleImageChoices.length))}
              disabled={isBusy || sampleImageChoices.length === 0}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText variant="label-md" emphasis="medium" style={styles.sectionTitle}>
            Release Settings
          </ThemedText>
          <View style={styles.chipGrid}>
            <Chip label="Release Now" selected={releaseMode === 'now'} disabled={isBusy} onPress={() => setReleaseMode('now')} />
            <Chip label="Schedule" selected={releaseMode === 'schedule'} disabled={isBusy} onPress={() => setReleaseMode('schedule')} />
          </View>
          {releaseMode === 'schedule' && (
            <ThemedText variant="body-sm" emphasis="medium">
              Scheduling isn&apos;t available in this preview — the track will still publish immediately when you tap Publish Track.
            </ThemedText>
          )}
          <ToggleRow title="Explicit Content" value={explicit} onValueChange={setExplicit} disabled={isBusy} />
        </View>

        {activeEntry && (activeEntry.status === 'uploading' || activeEntry.status === 'processing') && (
          <View style={styles.statusBanner}>
            <Icon name="sync" size={18} color={Colors.primary} />
            <ThemedText variant="label-md">
              {activeEntry.status === 'uploading' ? 'Uploading…' : 'Processing…'}
            </ThemedText>
          </View>
        )}

        {activeEntry?.status === 'error' && (
          <View style={styles.errorBanner}>
            <Icon name="error-outline" size={18} color={Colors.error} />
            <ThemedText variant="label-md" style={styles.errorText}>
              Something went wrong publishing this track.
            </ThemedText>
            <TextLinkButton label="Retry" onPress={() => activeTrackId && retryPublish(activeTrackId)} />
          </View>
        )}

        <PillButton
          label="Publish Track"
          trailingIcon="arrow-forward"
          disabled={!canPublish || isBusy}
          loading={isBusy}
          onPress={handlePublish}
          style={styles.cta}
        />
        <TextLinkButton label="Save as Draft" onPress={handleSaveAsDraft} disabled={isBusy} />
        <TextLinkButton label="Simulate publish error (demo)" onPress={handleSimulateError} disabled={isBusy || !canPublish} style={styles.demoErrorLink} />
      </ScrollView>

      <Toast message="Saved as draft" icon="save" visible={draftSavedToastVisible} />
    </ThemedView>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.margin,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  field: {
    gap: Spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface.l1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  cta: {
    marginTop: Spacing.sm,
  },
  demoErrorLink: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.margin,
    gap: Spacing.sm,
  },
  resultIconHalo: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  resultButton: {
    width: '100%',
    marginTop: Spacing.md,
  },
});
