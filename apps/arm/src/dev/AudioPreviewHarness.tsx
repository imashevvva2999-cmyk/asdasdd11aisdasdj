import { useState } from 'react';

import { PageHeader } from '@mmusic/backoffice/ui';

import { AudioPreview } from '@/components/AudioPreview';

/**
 * DEVELOPMENT-ONLY test bench for the moderation audio preview (route /dev/audio-preview, registered only under
 * import.meta.env.DEV; never in production builds and never linked to a moderation track). It exercises the player
 * with a licensed file, an unsupported source and the no-audio state.
 *
 * Licensed file: "Chill Wave" — Kevin MacLeod (incompetech.com), CC BY 4.0 (apps/mobile/assets/audio/CREDITS.md).
 */
const LICENSED = new URL('../../../mobile/assets/audio/chill-wave.mp3', import.meta.url).href;
const NOT_AUDIO = 'data:text/plain;base64,bm90IGF1ZGlv';

export function AudioPreviewHarness() {
  const [source, setSource] = useState<'licensed' | 'unsupported' | 'none'>('licensed');
  const src = source === 'licensed' ? LICENSED : source === 'unsupported' ? NOT_AUDIO : undefined;
  return (
    <main className="bo-main" style={{ maxWidth: 720 }}>
      <PageHeader title="Audio preview — dev test bench" subtitle="Development only. Not linked to any moderation track." />
      <fieldset className="bo-tabs" aria-label="Source" style={{ border: 0, margin: '0 0 16px' }}>
        {(['licensed', 'unsupported', 'none'] as const).map((key) => (
          <button key={key} type="button" className={key === source ? 'bo-tab active' : 'bo-tab'} style={{ border: 0, background: key === source ? undefined : 'none', cursor: 'pointer' }} onClick={() => setSource(key)} data-source={key}>
            {key}
          </button>
        ))}
      </fieldset>
      <section className="bo-card">
        <AudioPreview src={src} title={source === 'licensed' ? 'Chill Wave — Kevin MacLeod (CC BY 4.0)' : `Test: ${source}`} />
        <p className="bo-muted" style={{ fontSize: 12, margin: 0 }}>
          “Chill Wave” Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 — creativecommons.org/licenses/by/4.0/
        </p>
      </section>
    </main>
  );
}
