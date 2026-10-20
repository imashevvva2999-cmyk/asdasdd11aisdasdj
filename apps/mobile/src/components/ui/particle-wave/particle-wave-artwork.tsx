import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { toImageSource } from '@/constants/artwork-sources';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import type { TrackId } from '@/mocks';

export type ParticleWaveArtworkProps = {
  /** The approved still artwork. */
  uri: LocalOrRemoteImage;
  /** Web only (the particle wave pauses); ignored here. */
  paused?: boolean;
  /** Web only (audio-reactive colour); ignored here. */
  trackId?: TrackId;
  /** Web only (audio-reactive bands); ignored here. */
  playing?: boolean;
};

/** Native builds show the approved still artwork; the particle wave is WebGL on the web (particle-wave-artwork.web.tsx). */
export function ParticleWaveArtwork({ uri }: ParticleWaveArtworkProps) {
  return <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />;
}
