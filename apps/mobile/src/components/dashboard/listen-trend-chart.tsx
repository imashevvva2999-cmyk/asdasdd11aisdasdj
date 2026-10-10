import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { smoothAreaPath } from '@/lib/svg-path';
import type { TrendPoint } from '@/lib/analytics-mock';

const CHART_WIDTH = 340;
const CHART_HEIGHT = 130;

/** The "Listening Trend" area+line chart (Stitch Artist Dashboard Analytics,
 * "midnight_mirage" export) — real mock data in, matching smoothed SVG curve
 * out, instead of the mockup's one fixed path string. */
export function ListenTrendChart({ points, peakLabel }: { points: TrendPoint[]; peakLabel: string }) {
  const { linePath, areaPath } = smoothAreaPath(
    points.map((p) => p.value),
    CHART_WIDTH,
    CHART_HEIGHT,
  );

  return (
    <View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={Colors.secondary} />
            <Stop offset="100%" stopColor={Colors.primary} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={CHART_HEIGHT * 0.15} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.15} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Line x1={0} y1={CHART_HEIGHT * 0.5} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Line x1={0} y1={CHART_HEIGHT * 0.85} x2={CHART_WIDTH} y2={CHART_HEIGHT * 0.85} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <Path d={areaPath} fill="url(#trendFill)" />
        <Path d={linePath} fill="none" stroke="url(#trendStroke)" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
      <View style={styles.footer}>
        <ThemedText variant="body-sm" emphasis="medium">
          {points[0]?.label}
        </ThemedText>
        <ThemedText variant="body-sm" style={styles.peak}>
          {peakLabel}
        </ThemedText>
        <ThemedText variant="body-sm" emphasis="medium">
          {points[points.length - 1]?.label}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  peak: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
