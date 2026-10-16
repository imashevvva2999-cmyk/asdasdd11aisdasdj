import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState, Icon, PillButton, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { demoLoginAvailability, verifyDemoCredentials } from '@/demo/demo-config';
import { useDemoStrings } from '@/demo/demo-strings';
import { useDemoSessionStore } from '@/state/demo-session-store';

/** Dev-only Demo Artist login (src/demo/demo-config.ts). A production build
 * renders the "not available" state; no real authentication happens here. */
export default function DemoLoginScreen() {
  const { d } = useDemoStrings();
  const signIn = useDemoSessionStore((s) => s.signIn);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const availability = demoLoginAvailability();

  if (availability !== 'enabled') {
    const prod = availability === 'production';
    return (
      <ThemedView surface="canvas" style={styles.flex}>
        <EmptyState icon="lock" title={prod ? d.productionTitle : d.notConfiguredTitle} hint={prod ? d.productionHint : d.notConfiguredHint} />
      </ThemedView>
    );
  }

  function submit() {
    if (!login.trim() || !password) return setError(d.fillBoth);
    if (!verifyDemoCredentials(login, password)) return setError(d.wrongCredentials);
    setError(undefined);
    setPassword('');
    signIn();
    router.replace('/profile/artist/dashboard');
  }

  return (
    <ThemedView surface="canvas" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText variant="headline-md">{d.loginTitle}</ThemedText>
        <ThemedText variant="body-md" emphasis="medium">
          {d.loginIntro}
        </ThemedText>
        <TextField
          label={d.loginLabel}
          value={login}
          onChangeText={(v) => {
            setLogin(v);
            setError(undefined);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
        <TextField
          label={d.passwordLabel}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(undefined);
          }}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        {error && (
          <View style={styles.errorRow} accessibilityRole="alert">
            <Icon name="error-outline" size={16} color={Colors.error} />
            <ThemedText variant="body-sm" style={{ color: Colors.error }}>
              {error}
            </ThemedText>
          </View>
        )}
        <PillButton label={d.signIn} trailingIcon="arrow-forward" onPress={submit} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.margin, gap: Spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
