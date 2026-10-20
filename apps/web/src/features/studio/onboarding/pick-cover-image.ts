/**
 * Cover artwork picker for Upload Track — the website port of the Expo app's web picker (src/lib/pick-cover-image.ts):
 * the browser's file chooser limited to JPG/PNG/WebP, validated, and downscaled to at most COVER_MAX_PX as a JPEG
 * data URL small enough for the browser-local artist storage. Nothing is uploaded; the image stays on the device.
 */
export type CoverPickResult = { kind: 'picked'; uri: string } | { kind: 'cancelled' } | { kind: 'invalid-type' } | { kind: 'too-large' } | { kind: 'unreadable' };

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_MAX_PX = 800;

export function validateCoverFile(file: { type: string; size: number }): CoverPickResult | undefined {
  if (!COVER_TYPES.includes(file.type.toLowerCase())) return { kind: 'invalid-type' };
  if (file.size > COVER_MAX_BYTES) return { kind: 'too-large' };
  return undefined;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
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

/** Validate + downscale one chosen file (from an <input type="file"> change event). */
export async function processCoverFile(file: File | undefined): Promise<CoverPickResult> {
  if (!file) return { kind: 'cancelled' };
  const problem = validateCoverFile(file);
  if (problem) return problem;
  try {
    return { kind: 'picked', uri: await downscale(await readAsDataUrl(file)) };
  } catch {
    return { kind: 'unreadable' };
  }
}
