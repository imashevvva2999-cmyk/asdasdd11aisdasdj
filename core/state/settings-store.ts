import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentUser } from '../mocks';
import { appStateStorage, isBoolean, isFiniteNumber, persistedOr } from '../platform/app-state-storage';

export const STREAM_QUALITIES = ['Low', 'Normal', 'High'] as const;
export type StreamQuality = (typeof STREAM_QUALITIES)[number];

/** Mock storage figures (GB) shown on Downloads & Offline. Nothing is measured. */
const MUSIC_STORAGE_GB = 12.8;
const CACHE_STORAGE_GB = 1.4;

/**
 * Session-local app settings shared by Settings (S-24) and its split
 * destinations — Audio Quality & Playback, Downloads & Offline, Account &
 * Security — so a toggle changed on one screen reads the same on the others.
 *
 * Frontend-only preferences: nothing here changes real playback, streaming
 * bitrate, downloads, storage, MBANK authorization or email delivery, and
 * nothing is persisted. Lossless / Dolby Atmos availability is an open
 * product question (OQ-22) — the screens label them as preview settings.
 */
type SettingsState = {
  lossless: boolean;
  dolbyAtmos: boolean;
  volumeNormalization: boolean;
  wifiQuality: StreamQuality;
  cellularQuality: StreamQuality;
  gapless: boolean;
  crossfadeSec: number;
  downloadQuality: StreamQuality;
  downloadOverCellular: boolean;
  musicStorageGb: number;
  cacheGb: number;
  fastPayAuth: boolean;
  supportReceipts: boolean;

  setFlag: (key: BooleanSettingKey, value: boolean) => void;
  cycleQuality: (key: QualitySettingKey) => StreamQuality;
  setCrossfade: (sec: number) => void;
  clearCache: () => void;
};

export type BooleanSettingKey = 'lossless' | 'dolbyAtmos' | 'volumeNormalization' | 'gapless' | 'downloadOverCellular' | 'fastPayAuth' | 'supportReceipts';
export type QualitySettingKey = 'wifiQuality' | 'cellularQuality' | 'downloadQuality';

const BOOLEAN_KEYS: BooleanSettingKey[] = ['lossless', 'dolbyAtmos', 'volumeNormalization', 'gapless', 'downloadOverCellular', 'fastPayAuth', 'supportReceipts'];
const QUALITY_KEYS: QualitySettingKey[] = ['wifiQuality', 'cellularQuality', 'downloadQuality'];
const NUMBER_KEYS = ['crossfadeSec', 'musicStorageGb', 'cacheGb'] as const;
const isQuality = (value: unknown): value is StreamQuality => (STREAM_QUALITIES as readonly unknown[]).includes(value);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
  lossless: true,
  dolbyAtmos: false,
  volumeNormalization: true,
  wifiQuality: 'High',
  cellularQuality: 'Normal',
  gapless: true,
  crossfadeSec: 4,
  downloadQuality: 'High',
  downloadOverCellular: false,
  musicStorageGb: MUSIC_STORAGE_GB,
  cacheGb: CACHE_STORAGE_GB,
  fastPayAuth: true,
  supportReceipts: true,

  setFlag: (key, value) => set({ [key]: value } as Pick<SettingsState, BooleanSettingKey>),
  cycleQuality: (key) => {
    const current = get()[key];
    const next = STREAM_QUALITIES[(STREAM_QUALITIES.indexOf(current) + 1) % STREAM_QUALITIES.length];
    set({ [key]: next } as Pick<SettingsState, QualitySettingKey>);
    return next;
  },
  setCrossfade: (sec) => set({ crossfadeSec: Math.max(0, Math.min(12, sec)) }),
  clearCache: () => set({ cacheGb: 0 }),
    }),
    {
      // Kept across launches by the native app only (platform/app-state-storage.ts).
      name: `mmusic:settings:${currentUser.username}`,
      storage: createJSONStorage(() => appStateStorage),
      skipHydration: true,
      partialize: (state) => Object.fromEntries([...BOOLEAN_KEYS, ...QUALITY_KEYS, ...NUMBER_KEYS].map((key) => [key, state[key]])),
      // Field by field: one corrupted value keeps its default, the others still load.
      merge: (persisted, current) => {
        const next = { ...current };
        for (const key of BOOLEAN_KEYS) next[key] = persistedOr(persisted, key, isBoolean, current[key]);
        for (const key of QUALITY_KEYS) next[key] = persistedOr(persisted, key, isQuality, current[key]);
        for (const key of NUMBER_KEYS) next[key] = persistedOr(persisted, key, isFiniteNumber, current[key]);
        next.crossfadeSec = Math.max(0, Math.min(12, next.crossfadeSec));
        return next;
      },
    },
  ),
);
