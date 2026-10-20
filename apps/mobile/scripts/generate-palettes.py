#!/usr/bin/env python3
"""Generate core/constants/artwork-palettes.ts (@mmusic/core) from the local cover art.

Development-only tool (Шаг 1 of the player gestures plan): uses Pillow, which
is not a project dependency and never ships with the app. Re-run it whenever
artwork in core/constants/stitch-artwork.ts changes; scripts/verify-palettes.mjs
fails if the generated file is stale.

Usage (from apps/mobile): python3 scripts/generate-palettes.py
"""
import colorsys
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT.parent.parent / 'core'  # the catalog lives in @mmusic/core (W2.4b group 4); the image files stay in apps/mobile
SOURCE = CORE / 'constants/stitch-artwork.ts'
ARTWORK_DIR = ROOT / 'assets/artwork'
OUTPUT = CORE / 'constants/artwork-palettes.ts'

# The maps the player needs: a track's own art, its generated art, its album's cover.
MAPS = ['stitchArtworkByTrackId', 'generatedArtworkByTrackId', 'stitchArtworkByAlbumId', 'generatedArtworkByAlbumId']
SURFACE = (0x14, 0x14, 0x18)  # Colors.surface.l1
MIN_BACKGROUND_CONTRAST = 5.2  # white text, with margin over the 5:1 test
MINI_MIX = 0.22
# Same fail-closed check as stitch-artwork.ts: a bundler that does not define
# __DEV__ (or defines it false) gets no development-only entries.
DEV_GUARD = "typeof __DEV__ !== 'undefined' && __DEV__"
DEV_COMMENT = '// Development-only (rights not confirmed): absent from production builds.'


def parse_maps(text):
    """Regular entries, and development-only ones (a `__DEV__ ? { key: 'asset:…' } : {}` spread) kept apart."""
    maps, dev = {}, {}
    for name in MAPS:
        block = text.split(f'export const {name}')[1].split('};')[0]
        entries = re.findall(r"^\s*'?([a-z0-9-]+)'?:\s*'asset:([^']+)'", block, re.M)
        maps[name] = {key: path for key, path in entries}
        dev[name] = dict(re.findall(r"__DEV__\s*\?\s*\{\s*'?([a-z0-9-]+)'?:\s*'asset:([^']+)'\s*\}", block))
    return maps, dev


def ts(value, indent=0):
    """JSON as a single-quoted TS literal, indented to sit `indent` spaces deep."""
    return json.dumps(value, indent=2).replace('"', "'").replace('\n', '\n' + ' ' * indent)


def inline(value):
    if isinstance(value, dict):
        return '{ ' + ', '.join(f'{inline(k)}: {inline(v)}' for k, v in value.items()) + ' }'
    return json.dumps(value).replace('"', "'")


def with_dev(literal, dev, indent):
    """Append development-only entries to an object literal, behind DEV_GUARD."""
    if not dev:
        return literal
    pad = ' ' * (indent + 2)
    closing = '\n' + ' ' * indent + '}'
    assert literal.endswith(closing)
    return literal[: -len(closing)] + f',\n{pad}{DEV_COMMENT}\n{pad}...({DEV_GUARD} ? {inline(dev)} : {{}})' + closing


def luminance(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


def hexc(rgb):
    return '#%02x%02x%02x' % rgb


def palette(path):
    img = Image.open(path).convert('RGB').resize((64, 64))
    quant = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    pal = quant.getpalette()[: 8 * 3]
    counts = quant.getcolors()
    total = sum(c for c, _ in counts)
    best = None
    for count, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
        # Common AND characterful: favour saturated mid-tones over near-black/white.
        score = (count / total) * (0.35 + s) * (1 - abs(l - 0.45))
        if best is None or score > best[0]:
            best = (score, h, l, s)
    _, h, l, s = best
    sat = min(max(s, 0.18), 0.62)
    light = 0.42
    background = hls(h, light, sat)
    while contrast(background, (255, 255, 255)) < MIN_BACKGROUND_CONTRAST and light > 0.06:
        light -= 0.01
        background = hls(h, light, sat)
    deep = hls(h, max(light * 0.45, 0.05), sat * 0.9)
    mini = tuple(round(SURFACE[i] * (1 - MINI_MIX) + background[i] * MINI_MIX) for i in range(3))
    accent = hls(h, min(max(l, 0.55), 0.7), min(s + 0.1, 0.85))
    return {'background': hexc(background), 'deep': hexc(deep), 'mini': hexc(mini), 'accent': hexc(accent)}


def main():
    maps, dev = parse_maps(SOURCE.read_text())
    paths = sorted({p for m in maps.values() for p in m.values()})
    dev_paths = sorted({p for m in dev.values() for p in m.values()} - set(paths))
    palettes = {p: palette(ARTWORK_DIR / p) for p in paths}
    dev_palettes = {p: palette(ARTWORK_DIR / p) for p in dev_paths}
    paths_literal = '{\n' + ',\n'.join(f"  '{name}': " + with_dev(ts(maps[name], 2), dev[name], 2) for name in MAPS) + '\n}'
    lines = [
        '// GENERATED by apps/mobile/scripts/generate-palettes.py from core/constants/stitch-artwork.ts',
        '// and apps/mobile/assets/artwork — do not edit by hand; re-run the script when artwork changes.',
        "import type { ArtworkPalette } from '../lib/palette';",
        '',
        f"export type ArtworkMapName = {' | '.join(repr(n) for n in MAPS)};",
        '',
        '/** Artwork file (relative to assets/artwork) per entity, mirroring stitch-artwork.ts. */',
        'export const artworkPathsByMap: Record<ArtworkMapName, Record<string, string>> = ' + paths_literal + ';',
        '',
        '/** Measured palette per artwork file. */',
        'export const palettesByArtworkPath: Record<string, ArtworkPalette> = ' + with_dev(ts(palettes), dev_palettes, 0) + ';',
        '',
    ]
    OUTPUT.write_text('\n'.join(lines))
    print(f'wrote {OUTPUT.relative_to(CORE.parent)}: {len(paths)} artworks + {len(dev_paths)} development-only')


if __name__ == '__main__':
    main()
