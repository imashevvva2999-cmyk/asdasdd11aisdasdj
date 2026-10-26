import { createAudioAnalyser } from './audio-analyser-core';
import { onAudioSample } from './expo-audio-engine';
import { createPcmAnalyser, SAMPLE_RATE } from './pcm-analyser';

type Analyser = ReturnType<typeof createAudioAnalyser>;

let singleton: Analyser | null = null;

/** Native counterpart of audio-analyser.web.ts: bass/mid/high bands of the app's own playback. */
export function getSharedAnalyser(): Analyser | null {
  if (singleton) return singleton;
  const pcm = createPcmAnalyser();
  onAudioSample(({ channels }) => {
    const first = channels[0];
    if (!first) return;
    if (channels.length === 1) {
      pcm.push(first.frames);
      return;
    }
    const mono = new Float32Array(first.frames.length);
    for (const { frames } of channels) {
      for (let i = 0; i < mono.length; i += 1) mono[i] = (mono[i] ?? 0) + (frames[i] ?? 0) / channels.length;
    }
    pcm.push(mono);
  });
  singleton = createAudioAnalyser({ analyser: pcm, sampleRate: SAMPLE_RATE });
  return singleton;
}
