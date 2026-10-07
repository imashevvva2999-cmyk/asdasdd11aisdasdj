import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** Home tab's own stack (docs/screens.md §1: Home → See All). */
export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.canvas },
        headerTintColor: Colors.text.high,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="see-all" options={{ title: 'See All', headerTitleAlign: 'center' }} />
    </Stack>
  );
}
