import type { MoodMix } from './types';

/** "Mood & Vibe Mixes — Tuned to You" 2x2 grid (docs/screens.md §3.1 S-01). */
export const moodMixes: MoodMix[] = [
  { id: 'late-night', title: 'Late Night', subtitle: 'Slow tempo & bass', trackCount: 38, icon: 'dark-mode', tint: 'primary' },
  { id: 'melancholy', title: 'Melancholy', subtitle: 'Piano & quiet rain', trackCount: 24, icon: 'water-drop', tint: 'tertiary' },
  { id: 'high-energy', title: 'High Energy', subtitle: 'Driving rhythms', trackCount: 45, icon: 'bolt', tint: 'secondary' },
  { id: 'flow-state', title: 'Flow State', subtitle: 'Deep focus binaural', trackCount: 52, icon: 'waves', tint: 'primary' },
];
