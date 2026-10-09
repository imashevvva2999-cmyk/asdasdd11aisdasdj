import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';

export type ParticleWaveArtworkProps = {
  /** The approved still artwork. */
  uri: LocalOrRemoteImage;
  /** Web only (the particle wave pauses); ignored here. */
  paused?: boolean;
};

/** Native builds show the approved still artwork; the particle wave is WebGL on the web (particle-wave-artwork.web.tsx). */
export function ParticleWaveArtwork({ uri }: ParticleWaveArtworkProps) {
  return <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
}
