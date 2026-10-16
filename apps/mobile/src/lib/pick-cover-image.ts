/**
 * Cover artwork picker for Upload Track (web build — Mmusic ships as a website).
 *
 * Opens the browser's native file chooser (gallery / photos on phones, Finder /
 * Explorer on desktop) limited to JPG, PNG and WebP, validates the file, and
 * downsizes it to at most COVER_MAX_PX so the resulting data URL stays small
 * enough for the browser-local artist storage. No upload happens — the image
 * stays on the device. Native builds have no picker dependency yet and return
 * 'unsupported' (the screen keeps its sample-cover fallback there).
 */
export type CoverPickResult =
  | { kind: 'picked'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'invalid-type' }
  | { kind: 'too-large' }
  | { kind: 'unreadable' }
  | { kind: 'unsupported' };

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_MAX_PX = 800;

/** Pure validation (unit-tested): type and size of the chosen file. */
export function validateCoverFile(file: { type: string; size: number }): CoverPickResult | undefined {
  if (!COVER_TYPES.includes(file.type.toLowerCase())) return { kind: 'invalid-type' };
  if (file.size > COVER_MAX_BYTES) return { kind: 'too-large' };
  return undefined;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

async function downscale(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, COVER_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export function pickCoverImage(): Promise<CoverPickResult> {
  // Web only: native builds have no DOM (and no image-picker dependency yet).
  if (typeof document === 'undefined' || typeof window === 'undefined') return Promise.resolve({ kind: 'unsupported' });
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = COVER_TYPES.join(',');
    input.style.display = 'none';
    let settled = false;
    const finish = (result: CoverPickResult) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(result);
    };
    input.addEventListener('cancel', () => finish({ kind: 'cancelled' }));
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return finish({ kind: 'cancelled' });
      const problem = validateCoverFile(file);
      if (problem) return finish(problem);
      try {
        finish({ kind: 'picked', uri: await downscale(await readAsDataUrl(file)) });
      } catch {
        finish({ kind: 'unreadable' });
      }
    });
    document.body.appendChild(input);
    input.click();
  });
}
