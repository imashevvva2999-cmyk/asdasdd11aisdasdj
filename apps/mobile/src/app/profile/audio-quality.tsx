import { ScrollView } from 'react-native';

import { SettingsSectionCard, settingsScreenStyles, useSettingsSections } from '@/components/settings-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/hooks/use-toast';
import { useAppStrings } from '@/state/locale-store';

/**
 * Audio Quality & Playback — Profile Hub destination (S-23). Shows only the
 * audio/playback sections of S-24 Settings. Values are session-local
 * preferences; nothing changes real streaming quality (Lossless / Dolby Atmos
 * availability is still open — OQ-22).
 */
export default function AudioQualityScreen() {
  const { showToast, toast } = useToast();
  const sections = useSettingsSections(showToast);
  const { t } = useAppStrings();

  return (
    <ThemedView surface="canvas" style={settingsScreenStyles.flex}>
      <ScrollView contentContainerStyle={settingsScreenStyles.content}>
        <ThemedText variant="body-md" emphasis="medium">
          {t('audioQualityIntroText')}
        </ThemedText>
        <SettingsSectionCard section={sections.audio} />
        <SettingsSectionCard section={sections.playback} />
      </ScrollView>
      {toast}
    </ThemedView>
  );
}
