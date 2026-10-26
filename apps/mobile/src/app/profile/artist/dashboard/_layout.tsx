import { router, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { DashboardModeSwitch, type DashboardMode } from '@/components/dashboard/dashboard-mode-switch';
import { DashboardTabBar } from '@/components/dashboard/dashboard-tab-bar';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing } from '@/constants/theme';
import { useDemoStrings } from '@/demo/demo-strings';
import { isGuestPreview, useIsGuestPreview } from '@/demo/guest-mode';
import { goBack } from '@/lib/navigation';
import { enterGuestPreview, exitGuestPreview, useIsDemoArtist } from '@/state/demo-session-store';

const ICON_SIZE = 22;
/** Mode change: the tab content fades out, the data is swapped while it is invisible, then it fades back in. */
const FADE_OUT_MS = 160;
const FADE_IN_MS = 190;
const BANNER_MS = 180;

/** Artist Dashboard's own navigator (OQ-56) — Overview/Analytics/Promotion/
 * Studio Pro, architecturally independent from the listener `(tabs)` group.
 *
 * "Мой кабинет" / "Demo Artist" switches the mode in place: the guest preview
 * (read-only Solaris Echo data in the shared stores) is entered or left right
 * here, so the header, the switch, the open tab and the tab bar stay mounted
 * and only the tab content cross-fades. Opened at /demo/artist instead (that
 * route re-exports this layout), the /demo stack owns the preview and
 * "Мой кабинет" returns to the user's own dashboard. */
export default function DashboardLayout() {
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const { d } = useDemoStrings();
  const reduceMotion = useReducedMotion();
  // Mounted inside the /demo stack (the preview was already on before this screen).
  const [routePreview] = useState(isGuestPreview);
  const [contentOpacity] = useState(() => new RNAnimated.Value(1));
  // The mode the user picked, shown by the switch while the content transition runs.
  const [pendingMode, setPendingMode] = useState<DashboardMode | null>(null);
  const fadeInAfterSwap = useRef(false);
  const mode: DashboardMode = pendingMode ?? (guest ? 'demo' : 'real');
  // Each tab scene renders in an Animated.View (the navigator's Screen →
  // Background), so an Animated.Value opacity drives it on the native thread;
  // the option is only typed as a static ViewStyle.
  const [sceneFade] = useState(() => ({ opacity: contentOpacity }) as unknown as ViewStyle);

  const fadeContentIn = () => {
    RNAnimated.timing(contentOpacity, { toValue: 1, duration: FADE_IN_MS, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }).start(() =>
      setPendingMode(null),
    );
  };

  // The swapped data has rendered (this runs after the commit): fade it in.
  useEffect(() => {
    if (!fadeInAfterSwap.current) return;
    fadeInAfterSwap.current = false;
    fadeContentIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest]);

  // Leaving the dashboard in Demo Artist mode ends the preview here, so the rest
  // of the app never keeps the read-only demo data.
  useEffect(
    () => () => {
      if (!routePreview && isGuestPreview()) exitGuestPreview();
    },
    [routePreview],
  );

  const swapMode = (next: DashboardMode) => {
    if (next === 'demo') enterGuestPreview();
    else exitGuestPreview();
  };

  const onModeChange = (next: DashboardMode) => {
    if (next === mode || pendingMode) return;
    if (routePreview) {
      // Only "Мой кабинет" is offered here: back to the dashboard underneath (or open it).
      if (next === 'real') goBack('/profile/artist/dashboard');
      return;
    }
    if (reduceMotion) {
      swapMode(next);
      return;
    }
    setPendingMode(next);
    RNAnimated.timing(contentOpacity, { toValue: 0, duration: FADE_OUT_MS, easing: RNEasing.in(RNEasing.quad), useNativeDriver: true }).start(() => {
      const before = isGuestPreview();
      fadeInAfterSwap.current = true;
      swapMode(next);
      // Nothing to re-render (already in that mode): fade straight back in.
      if (isGuestPreview() === before) {
        fadeInAfterSwap.current = false;
        fadeContentIn();
      }
    });
  };

  return (
    <View style={styles.flex}>
      <DashboardModeSwitch mode={mode} onChange={onModeChange} />
      {guest && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(BANNER_MS)}
          exiting={reduceMotion ? undefined : FadeOut.duration(BANNER_MS)}
          style={styles.banner}
          accessibilityRole="text"
        >
          <Icon name="visibility" size={14} color={Colors.secondary} />
          <ThemedText variant="label-sm" style={{ color: Colors.secondary }}>
            {d.guestBadge}
          </ThemedText>
          <ThemedText variant="label-sm" style={styles.bannerText} numberOfLines={1}>
            {d.guestBanner}
          </ThemedText>
          <View style={styles.readOnlyPill}>
            <Icon name="lock" size={11} color={Colors.text.medium} />
            <ThemedText variant="label-sm" emphasis="medium">
              {d.readOnly}
            </ThemedText>
          </View>
        </Animated.View>
      )}
      {demo && !guest && (
        <View style={styles.banner} accessibilityRole="text">
          <Icon name="science" size={14} color={Colors.secondary} />
          <ThemedText variant="label-sm" style={styles.bannerText} numberOfLines={1}>
            {d.banner}
          </ThemedText>
          <Pressable accessibilityRole="link" onPress={() => router.push('/profile/demo-account')} hitSlop={8}>
            <ThemedText variant="label-sm" style={{ color: Colors.primary }}>
              {d.manage}
            </ThemedText>
          </Pressable>
        </View>
      )}
      {/* sceneStyle: only the tab content fades — the tab bar and the switch stay put. */}
      <Tabs screenOptions={{ headerShown: false, sceneStyle: sceneFade }} tabBar={(props) => <DashboardTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color }) => <Icon name="dashboard" color={color} size={ICON_SIZE} /> }} />
        <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Icon name="show-chart" color={color} size={ICON_SIZE} /> }} />
        <Tabs.Screen name="promotion" options={{ title: 'Promotion', tabBarIcon: ({ color }) => <Icon name="campaign" color={color} size={ICON_SIZE} /> }} />
        <Tabs.Screen name="studio-pro" options={{ title: 'Studio Pro', tabBarIcon: ({ color }) => <Icon name="equalizer" color={color} size={ICON_SIZE} /> }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.margin,
    paddingVertical: 6,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  bannerText: { flex: 1, color: Colors.secondary },
  readOnlyPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
});
