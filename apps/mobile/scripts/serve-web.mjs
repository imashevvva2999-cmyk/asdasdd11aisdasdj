#!/usr/bin/env node
/**
 * Production web server for the static Expo export (W1 — docs/superpowers/
 * specs/2026-10-08-web-w1-w2.md). Used to preview and test the real build
 * (`pnpm --filter @mmusic/mobile preview:web`), and the reference for the
 * rules any host must reproduce (hosting is not chosen yet):
 *
 * 1. Clean URLs: /home → home.html or home/index.html.
 * 2. Deep links into dynamic routes: /artist/:id → artist/<id>.html if it was
 *    prerendered, otherwise the artist/[id].html template (200).
 * 3. Anything else → 404 with +not-found.html.
 * 4. HTTP Range on every file (206/416) — Safari won't play or seek audio
 *    without it.
 * 5. Cache: HTML no-cache; hashed bundles/assets immutable for a year.
 * 6. Baseline security headers; no path traversal; GET/HEAD only.
 *
 * Usage: node scripts/serve-web.mjs [dir=dist] [--port 8090] [--host 127.0.0.1]
 * No dependencies (Node built-ins only).
 */
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Clickjacking: the site is never framed (standalone website, not a WebView).
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

/** Hashed build output that never changes under the same URL. */
function isImmutable(urlPath) {
  return urlPath.startsWith('/_expo/') || urlPath.startsWith('/assets/');
}

/** A path segment that is not public: a route group "(tabs)" or a template "[id]". */
const PRIVATE_SEGMENT = /^\(.*\)$|^\[.*\]$/;

/** Dynamic route templates in the export, most specific first. */
function collectTemplates(root) {
  const templates = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.html')) continue;
      const rel = relative(root, full).split(sep).join('/').replace(/\.html$/, '').replace(/\/index$/, '');
      const segments = rel.split('/');
      if (segments.some((s) => /^\(.*\)$/.test(s))) continue; // groups are flattened in the export
      if (!segments.some((s) => /^\[.*\]$/.test(s))) continue;
      const pattern = segments
        .map((s) => (/^\[\.\.\..*\]$/.test(s) ? '.+' : /^\[.*\]$/.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/');
      templates.push({ regex: new RegExp(`^/${pattern}$`), file: full, dynamic: segments.filter((s) => s.startsWith('[')).length });
    }
  };
  walk(root);
  return templates.sort((a, b) => a.dynamic - b.dynamic);
}

/** Maps a URL path to a file in the export, or undefined (→ 404). */
export function resolveRoute(root, templates, urlPath) {
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.some((s) => s === '..' || s === '.' || s.includes('\0') || PRIVATE_SEGMENT.test(s))) return undefined;
  const base = resolve(root);
  const inRoot = (file) => file === base || file.startsWith(base + sep);
  const isFile = (file) => inRoot(file) && existsSync(file) && statSync(file).isFile();

  const direct = resolve(base, ...segments);
  for (const candidate of [direct, `${direct}.html`, join(direct, 'index.html')]) {
    if (isFile(candidate)) return candidate;
  }
  const clean = `/${segments.join('/')}`;
  return templates.find((t) => t.regex.test(clean))?.file;
}

/** Parses a single "bytes=" range against a file size; null = ignore, 'invalid' = 416. */
export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');
  if (!match) return null; // absent or multi-range: serve the whole file
  const [, from, to] = match;
  if (from === '' && to === '') return 'invalid';
  let start;
  let end;
  if (from === '') {
    start = Math.max(0, size - Number(to));
    end = size - 1;
  } else {
    start = Number(from);
    end = to === '' ? size - 1 : Math.min(Number(to), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}

export function createWebServer({ root }) {
  const base = resolve(root);
  const templates = collectTemplates(base);
  const notFound = join(base, '+not-found.html');

  return createServer((req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }

    const file = resolveRoute(base, templates, urlPath);
    if (!file) {
      res.statusCode = 404;
      res.setHeader('Content-Type', TYPES['.html']);
      res.setHeader('Cache-Control', 'no-cache');
      if (req.method === 'HEAD' || !existsSync(notFound)) {
        res.end();
        return;
      }
      createReadStream(notFound).pipe(res);
      return;
    }

    const size = statSync(file).size;
    const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', type.startsWith('text/html') ? 'no-cache' : isImmutable(urlPath) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');

    const range = parseRange(req.headers.range, size);
    if (range === 'invalid') {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    if (range) {
      res.writeHead(206, { 'Content-Range': `bytes ${range.start}-${range.end}/${size}`, 'Content-Length': range.end - range.start + 1 });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file, range).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Length': size });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  });
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index === -1 ? fallback : args[index + 1];
  };
  const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'dist';
  const port = Number(option('--port', 8090));
  const host = option('--host', '127.0.0.1');
  const root = resolve(dir);
  if (!existsSync(join(root, 'index.html'))) {
    console.error(`No web export in ${root}. Run "pnpm --filter @mmusic/mobile build:web" first.`);
    process.exit(1);
  }
  createWebServer({ root }).listen(port, host, () => {
    console.log(`Mmusic web build: http://${host}:${port} (from ${root})`);
  });
}
