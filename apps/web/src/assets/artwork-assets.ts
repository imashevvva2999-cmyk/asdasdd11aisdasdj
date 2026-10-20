import { isArtworkKey, type ArtworkKey, type LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';

import artAlbumsChronosEchoes from '../../../mobile/assets/artwork/albums/chronos-echoes.jpg?url';
import artAlbumsHorizonDeluxe from '../../../mobile/assets/artwork/albums/horizon-deluxe.jpg?url';
import artAlbumsLostFrequencies from '../../../mobile/assets/artwork/albums/lost-frequencies.jpg?url';
import artAlbumsNebulaDreams from '../../../mobile/assets/artwork/albums/nebula-dreams.jpg?url';
import artAlbumsNeoClassicalHorizons from '../../../mobile/assets/artwork/albums/neo-classical-horizons.jpg?url';
import artAlbumsRefractionHorizon from '../../../mobile/assets/artwork/albums/refraction-horizon.jpg?url';
import artAlbumsResonantField from '../../../mobile/assets/artwork/albums/resonant-field.jpg?url';
import artAlbumsSolitaryEcho from '../../../mobile/assets/artwork/albums/solitary-echo.jpg?url';
import artAlbumsVelvetSkyline from '../../../mobile/assets/artwork/albums/velvet-skyline.jpg?url';
import artArtistsKaelen from '../../../mobile/assets/artwork/artists/kaelen.jpg?url';
import artArtistsSolarisEcho from '../../../mobile/assets/artwork/artists/solaris-echo.jpg?url';
import artForyouAfterHours from '../../../mobile/assets/artwork/foryou/after-hours.jpg?url';
import artForyouChillElectronic from '../../../mobile/assets/artwork/foryou/chill-electronic.jpg?url';
import artForyouDeepFocus from '../../../mobile/assets/artwork/foryou/deep-focus.jpg?url';
import artForyouNeoSoul from '../../../mobile/assets/artwork/foryou/neo-soul.jpg?url';
import artForyouSyntheticWaves from '../../../mobile/assets/artwork/foryou/synthetic-waves.jpg?url';
import artGeneratedAbyssalBloomFeat from '../../../mobile/assets/artwork/generated/abyssal-bloom-feat.jpg?url';
import artGeneratedAfterimage from '../../../mobile/assets/artwork/generated/afterimage.jpg?url';
import artGeneratedArlo from '../../../mobile/assets/artwork/generated/arlo.jpg?url';
import artGeneratedChartsViral from '../../../mobile/assets/artwork/generated/charts-viral.jpg?url';
import artGeneratedChillLofi from '../../../mobile/assets/artwork/generated/chill-lofi.jpg?url';
import artGeneratedClassicalFilm from '../../../mobile/assets/artwork/generated/classical-film.jpg?url';
import artGeneratedCloverAndThePulse from '../../../mobile/assets/artwork/generated/clover-and-the-pulse.jpg?url';
import artGeneratedDeepFocusAmbient from '../../../mobile/assets/artwork/generated/deep-focus-ambient.jpg?url';
import artGeneratedElectronicDance from '../../../mobile/assets/artwork/generated/electronic-dance.jpg?url';
import artGeneratedElenaRostova from '../../../mobile/assets/artwork/generated/elena-rostova.jpg?url';
import artGeneratedEmberTide from '../../../mobile/assets/artwork/generated/ember-tide.jpg?url';
import artGeneratedFreshFinds from '../../../mobile/assets/artwork/generated/fresh-finds.jpg?url';
import artGeneratedHipHopRnb from '../../../mobile/assets/artwork/generated/hip-hop-rnb.jpg?url';
import artGeneratedHorizon from '../../../mobile/assets/artwork/generated/horizon.jpg?url';
import artGeneratedJazzSoul from '../../../mobile/assets/artwork/generated/jazz-soul.jpg?url';
import artGeneratedMadeForYou from '../../../mobile/assets/artwork/generated/made-for-you.jpg?url';
import artGeneratedMayaLin from '../../../mobile/assets/artwork/generated/maya-lin.jpg?url';
import artGeneratedNightSignal from '../../../mobile/assets/artwork/generated/night-signal.jpg?url';
import artGeneratedNilsFrahm from '../../../mobile/assets/artwork/generated/nils-frahm.jpg?url';
import artGeneratedPop from '../../../mobile/assets/artwork/generated/pop.jpg?url';
import artGeneratedResonantFieldReprise from '../../../mobile/assets/artwork/generated/resonant-field-reprise.jpg?url';
import artGeneratedRockIndie from '../../../mobile/assets/artwork/generated/rock-indie.jpg?url';
import artGeneratedSableDuo from '../../../mobile/assets/artwork/generated/sable-duo.jpg?url';
import artGeneratedStillWater from '../../../mobile/assets/artwork/generated/still-water.jpg?url';
import artGeneratedTateVane from '../../../mobile/assets/artwork/generated/tate-vane.jpg?url';
import artGeneratedThisIsSolarisEcho from '../../../mobile/assets/artwork/generated/this-is-solaris-echo.jpg?url';
import artGeneratedWorkoutHighEnergy from '../../../mobile/assets/artwork/generated/workout-high-energy.jpg?url';
import artGeneratedYukiTanaka from '../../../mobile/assets/artwork/generated/yuki-tanaka.jpg?url';
import artGenresKyrgyzMusic from '../../../mobile/assets/artwork/genres/kyrgyz-music.jpg?url';
import artPlaylistsElectronicEssentials from '../../../mobile/assets/artwork/playlists/electronic-essentials.jpg?url';
import artPlaylistsLateNightDriving from '../../../mobile/assets/artwork/playlists/late-night-driving.jpg?url';
import artPlaylistsLateNightFlow from '../../../mobile/assets/artwork/playlists/late-night-flow.jpg?url';
import artPlaylistsLofiBeatsToCode from '../../../mobile/assets/artwork/playlists/lofi-beats-to-code.jpg?url';
import artSamplesSample1 from '../../../mobile/assets/artwork/samples/sample-1.jpg?url';
import artSamplesSample2 from '../../../mobile/assets/artwork/samples/sample-2.jpg?url';
import artSamplesSample3 from '../../../mobile/assets/artwork/samples/sample-3.jpg?url';
import artSamplesSample4 from '../../../mobile/assets/artwork/samples/sample-4.jpg?url';
import artSamplesSample5 from '../../../mobile/assets/artwork/samples/sample-5.jpg?url';
import artSamplesSample6 from '../../../mobile/assets/artwork/samples/sample-6.jpg?url';
import artTracksAbyssalBloom from '../../../mobile/assets/artwork/tracks/abyssal-bloom.jpg?url';
import artTracksMidnightMirage from '../../../mobile/assets/artwork/tracks/midnight-mirage.jpg?url';
import artTracksObsidianFrequencies from '../../../mobile/assets/artwork/tracks/obsidian-frequencies.jpg?url';
import artTracksTapeSaturation4 from '../../../mobile/assets/artwork/tracks/tape-saturation-4.jpg?url';
import artTracksVaporTrails from '../../../mobile/assets/artwork/tracks/vapor-trails.jpg?url';

/**
 * Website artwork (W2.4c-2): every `asset:<path>` key used by @mmusic/core's catalog → the URL Vite serves the
 * Expo app's file under (apps/mobile/assets/artwork — reused in place). One explicit static import per file,
 * never a folder-wide glob. Ошондо's cover is development-only, exactly like its audio (./artwork-assets.dev.ts).
 */
const artworkUrls: Partial<Record<ArtworkKey, string>> = {
  'asset:albums/chronos-echoes.jpg': artAlbumsChronosEchoes,
  'asset:albums/horizon-deluxe.jpg': artAlbumsHorizonDeluxe,
  'asset:albums/lost-frequencies.jpg': artAlbumsLostFrequencies,
  'asset:albums/nebula-dreams.jpg': artAlbumsNebulaDreams,
  'asset:albums/neo-classical-horizons.jpg': artAlbumsNeoClassicalHorizons,
  'asset:albums/refraction-horizon.jpg': artAlbumsRefractionHorizon,
  'asset:albums/resonant-field.jpg': artAlbumsResonantField,
  'asset:albums/solitary-echo.jpg': artAlbumsSolitaryEcho,
  'asset:albums/velvet-skyline.jpg': artAlbumsVelvetSkyline,
  'asset:artists/kaelen.jpg': artArtistsKaelen,
  'asset:artists/solaris-echo.jpg': artArtistsSolarisEcho,
  'asset:foryou/after-hours.jpg': artForyouAfterHours,
  'asset:foryou/chill-electronic.jpg': artForyouChillElectronic,
  'asset:foryou/deep-focus.jpg': artForyouDeepFocus,
  'asset:foryou/neo-soul.jpg': artForyouNeoSoul,
  'asset:foryou/synthetic-waves.jpg': artForyouSyntheticWaves,
  'asset:generated/abyssal-bloom-feat.jpg': artGeneratedAbyssalBloomFeat,
  'asset:generated/afterimage.jpg': artGeneratedAfterimage,
  'asset:generated/arlo.jpg': artGeneratedArlo,
  'asset:generated/charts-viral.jpg': artGeneratedChartsViral,
  'asset:generated/chill-lofi.jpg': artGeneratedChillLofi,
  'asset:generated/classical-film.jpg': artGeneratedClassicalFilm,
  'asset:generated/clover-and-the-pulse.jpg': artGeneratedCloverAndThePulse,
  'asset:generated/deep-focus-ambient.jpg': artGeneratedDeepFocusAmbient,
  'asset:generated/electronic-dance.jpg': artGeneratedElectronicDance,
  'asset:generated/elena-rostova.jpg': artGeneratedElenaRostova,
  'asset:generated/ember-tide.jpg': artGeneratedEmberTide,
  'asset:generated/fresh-finds.jpg': artGeneratedFreshFinds,
  'asset:generated/hip-hop-rnb.jpg': artGeneratedHipHopRnb,
  'asset:generated/horizon.jpg': artGeneratedHorizon,
  'asset:generated/jazz-soul.jpg': artGeneratedJazzSoul,
  'asset:generated/made-for-you.jpg': artGeneratedMadeForYou,
  'asset:generated/maya-lin.jpg': artGeneratedMayaLin,
  'asset:generated/night-signal.jpg': artGeneratedNightSignal,
  'asset:generated/nils-frahm.jpg': artGeneratedNilsFrahm,
  'asset:generated/pop.jpg': artGeneratedPop,
  'asset:generated/resonant-field-reprise.jpg': artGeneratedResonantFieldReprise,
  'asset:generated/rock-indie.jpg': artGeneratedRockIndie,
  'asset:generated/sable-duo.jpg': artGeneratedSableDuo,
  'asset:generated/still-water.jpg': artGeneratedStillWater,
  'asset:generated/tate-vane.jpg': artGeneratedTateVane,
  'asset:generated/this-is-solaris-echo.jpg': artGeneratedThisIsSolarisEcho,
  'asset:generated/workout-high-energy.jpg': artGeneratedWorkoutHighEnergy,
  'asset:generated/yuki-tanaka.jpg': artGeneratedYukiTanaka,
  'asset:genres/kyrgyz-music.jpg': artGenresKyrgyzMusic,
  'asset:playlists/electronic-essentials.jpg': artPlaylistsElectronicEssentials,
  'asset:playlists/late-night-driving.jpg': artPlaylistsLateNightDriving,
  'asset:playlists/late-night-flow.jpg': artPlaylistsLateNightFlow,
  'asset:playlists/lofi-beats-to-code.jpg': artPlaylistsLofiBeatsToCode,
  'asset:samples/sample-1.jpg': artSamplesSample1,
  'asset:samples/sample-2.jpg': artSamplesSample2,
  'asset:samples/sample-3.jpg': artSamplesSample3,
  'asset:samples/sample-4.jpg': artSamplesSample4,
  'asset:samples/sample-5.jpg': artSamplesSample5,
  'asset:samples/sample-6.jpg': artSamplesSample6,
  'asset:tracks/abyssal-bloom.jpg': artTracksAbyssalBloom,
  'asset:tracks/midnight-mirage.jpg': artTracksMidnightMirage,
  'asset:tracks/obsidian-frequencies.jpg': artTracksObsidianFrequencies,
  'asset:tracks/tape-saturation-4.jpg': artTracksTapeSaturation4,
  'asset:tracks/vapor-trails.jpg': artTracksVaporTrails,
};

if (import.meta.env.DEV) Object.assign(artworkUrls, (await import('./artwork-assets.dev')).devArtworkUrls);

/**
 * An image URL for a catalog cover/photo field: artwork keys resolve to their bundled file, remote URLs pass
 * through, a `{ uri }` object yields its uri. Undefined when there is nothing to show (unknown key, no image).
 */
export function artworkUrl(value: LocalOrRemoteImage | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (isArtworkKey(value)) return artworkUrls[value];
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.uri;
  return undefined;
}
