import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { WebGLSceneController } from './webgl-scene-controller';

export type SceneEngineCtor = new (canvas: HTMLCanvasElement, onFallback: () => void) => WebGLSceneController;

export type LivingMoodSceneProps = {
  engine: SceneEngineCtor;
  active: boolean;
  fallbackColors: [string, string];
  style?: ViewStyle;
};

/** Native has no WebGL2-in-a-`<canvas>` story here (this prototype is
 * web-only per its own scope) — always renders the same gradient-style
 * placeholder the web build shows for its own non-WebGL fallback. */
export function LivingMoodScene({ fallbackColors, style }: LivingMoodSceneProps) {
  return <View style={[styles.container, { backgroundColor: fallbackColors[0] }, style]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
