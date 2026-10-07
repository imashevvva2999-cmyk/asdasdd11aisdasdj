import { ScrollView } from 'react-native';

import { SettingsSectionCard, settingsScreenStyles, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/hooks/use-toast';

/**
 * Audio Quality & Playback — Profile Hub destination (S-23). Shows only the
 * audio/playback sections of S-24 Settings. Values are session-local
 * preferences; nothing changes real streaming quality (Lossless / Dolby Atmos
 * availability is still open — OQ-22).
 */
export default function AudioQualityScreen() {
  const { showToast, toast } = useToast();
  const sections = useSettingsSections(showToast);

  return (
    <ThemedView surface="canvas" style={settingsScreenStyles.flex}>
      <ScrollView contentContainerStyle={settingsScreenStyles.content}>
        <ThemedText variant="body-md" emphasis="medium">
          Streaming quality and playback preferences. These are preview settings — playback isn&apos;t changed yet.
        </ThemedText>
        <SettingsSectionCard section={sections.audio} />
        <SettingsSectionCard section={sections.playback} />
      </ScrollView>
      {toast}
    </ThemedView>
  );
}
