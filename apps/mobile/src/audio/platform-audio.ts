/**
 * Starts the audio engine for this platform. Native builds use expo-audio;
 * the website resolves `platform-audio.web.ts` instead (one persistent <audio>
 * element + Media Session).
 */
export { startAudio } from './expo-audio-engine';
