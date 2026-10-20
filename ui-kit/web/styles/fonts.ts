// The same font files the Expo app loads (@expo-google-fonts, TTF only; no Expo code is imported).
import inter400 from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf';
import inter500 from '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf';
import inter600 from '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf';
import inter700 from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf';
import jakarta600 from '@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf';
import jakarta700 from '@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf';
import jakarta800 from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf';
import { fontFamilies } from '../../tokens';

const FACES: Array<[family: string, weight: number, url: string]> = [
  [fontFamilies.body, 400, inter400],
  [fontFamilies.body, 500, inter500],
  [fontFamilies.body, 600, inter600],
  [fontFamilies.body, 700, inter700],
  [fontFamilies.display, 600, jakarta600],
  [fontFamilies.display, 700, jakarta700],
  [fontFamilies.display, 800, jakarta800],
];

export function fontFacesCss(): string {
  return FACES.map(
    ([family, weight, url]) =>
      `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url("${url}") format("truetype")}`,
  ).join('');
}
