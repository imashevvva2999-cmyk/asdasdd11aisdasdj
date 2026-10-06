import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  /** Surface elevation per DESIGN.md "Elevation & Depth". Defaults to canvas (Layer 0). */
  surface?: 'canvas' | 'l1' | 'l2' | 'l3';
};

export function ThemedView({ style, surface = 'canvas', ...rest }: ThemedViewProps) {
  const backgroundColor = surface === 'canvas' ? Colors.canvas : Colors.surface[surface];

  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
