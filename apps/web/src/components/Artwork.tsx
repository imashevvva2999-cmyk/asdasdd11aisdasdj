import { useState } from 'react';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';

import { artworkUrl } from '@/assets/artwork-assets';

import './components.css';

type ArtworkProps = {
  /** A catalog cover/photo field: an artwork key, a remote URL or a `{ uri }` object. */
  source: LocalOrRemoteImage | undefined;
  /** Empty (default) for decorative artwork next to its title. */
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

/**
 * Catalog artwork for the website: resolved through the explicit artwork table (src/assets/artwork-assets.ts),
 * lazy-loaded, and replaced by a quiet surface when there is no image or it fails to load — never a broken image.
 */
export function Artwork({ source, alt = '', className, loading = 'lazy' }: ArtworkProps) {
  const url = artworkUrl(source);
  const [failedUrl, setFailedUrl] = useState<string>();
  const classes = (extra: string) => [extra, className].filter(Boolean).join(' ');

  if (url === undefined || failedUrl === url) {
    return (
      <span className={classes('artwork artwork-fallback')} aria-hidden={alt ? undefined : true}>
        {alt && <span className="visually-hidden">{alt}</span>}
      </span>
    );
  }
  return <img className={classes('artwork')} src={url} alt={alt} loading={loading} decoding="async" onError={() => setFailedUrl(url)} />;
}
