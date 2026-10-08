# W3 Этап 1 — Floating Canvas на iPhone: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести мобильный сайт (< 600 px) на Floating Canvas — сцена на Home, пилюля навигации, капсула, Lyrics/Queue с общим заголовком, переход сцена → плеер — не сломав ни одного жеста Dynamic Premium.

**Architecture:** Чистая логика (тона сцены, геометрия перехода, выбор текста песни) — отдельные модули в `src/lib/` с тестами в стиле `scripts/verify-*.mjs`. UI переиспользует общие shared values из `state/player-surface.ts` (`carouselPos`, `expandProgress`…), `ArtworkCarousel`, `SeekBar`, `PlayerBackground`, жесты мини-плеера. Маршруты и сторы не меняются. Для React-компонентов в проекте нет тестового раннера (и новые зависимости запрещены), поэтому UI-задачи проверяются в браузере по точным шагам.

**Tech Stack:** Expo SDK 57 / Expo Router web, React Native Web, Reanimated 4.5, RNGH 2.32, Zustand, expo-linear-gradient; тесты — `tsx` + plain asserts.

**Spec:** `docs/superpowers/specs/2026-10-08-w3-floating-canvas-implementation.md` (§2.4, §2.5, §3, §4 «Этап 1», §6). Макеты: `docs/superpowers/specs/w3-concepts/d-iphone.html`, `w3-concepts/iphone/*.png`.

## Global Constraints

- Работать в `apps/mobile`; `apps/api` не трогать.
- Новые зависимости не устанавливать; push и деплой запрещены; коммиты локальные.
- Коммиты не включают `apps/mobile/.claude-flow/`, `apps/mobile/.claude/proven-config*`, `.playwright-mcp/`, корневой `.claude-flow/policy/state.json`, `docs/superpowers/specs/w3-concepts/.claude-flow/`.
- Каждое сообщение коммита заканчивается строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Файлы < 500 строк; стиль окружающего кода (комментарии, имена).
- Тексты интерфейса — английские, как во всём приложении; документация — русская.
- Тексты песен только из `src/mocks/lyrics.ts`; пустое состояние демо-аудио дословно: «Lyrics unavailable for demo audio» / «This demo recording is instrumental.»
- Без стекла, размытия, свечения; коралл `Colors.primary` — только Play / Pause и активные состояния.
- Reduce motion: под пальцем всё следует за ним, без пальца — проявление ≤ 120 мс (`REDUCED_SETTLE_MS`).
- После каждой задачи: `pnpm --filter @mmusic/mobile test`, `typecheck`, `lint` — зелёные.
- Dev-сервер пользователя на порту 8082 не останавливать.
- Решения OQ-W3-1 и OQ-W3-2 (спецификация §9) применяются в задачах 3 и 7; до ответа — рекомендованный вариант.

## Review Focus

1. **Прокрутка Home вертикально по сцене** не должна листать треки и не должна открывать плеер — карусель реагирует только на горизонтальный жест, тап — только без движения (задача 7, шаг 5).
2. **Двойной плеер:** капсула и сцена никогда не видны одновременно, и капсула не мигает при переходе сцена → плеер (задачи 6–8).
3. **Трек без текста и без звука** (большинство каталога): Lyrics и строка в Now Playing не показывают пустых мест и чужих текстов (задача 3, `verify-lyrics-state`; задача 5, шаг 6).
4. **Ничего не играет** (холодный старт): Home без сцены-пустышки, капсулы нет, пилюля работает (задача 7, шаг 5).
5. **Прямая ссылка** `/player/lyrics` или `/player/queue` без играющего трека: экран не падает, есть путь назад (задачи 3–4).

---

### Task 1: Тона сцены и фон

**Files:**
- Create: `apps/mobile/src/lib/stage-tones.ts`
- Create: `apps/mobile/scripts/verify-stage-tones.mjs`
- Modify: `apps/mobile/package.json` (скрипт `test`: добавить `&& tsx scripts/verify-stage-tones.mjs`)
- Modify: `apps/mobile/src/components/player/player-background.tsx`

**Interfaces:**
- Produces: `mixHex(a: string, b: string, t: number): string`; `stageTop(palette: ArtworkPalette): string`; `STAGE_SHADE: { colors: string[]; locations: number[] }`; `STAGE_VIGNETTE: { colors: string[]; locations: number[] }`.

Сцена = анимированный верхний тон (`stageTop`) + неподвижное затемнение цветом фона `#0A0A0C` с прозрачностью 0 → 0.45 → 0.7 → 0.82. Для Horizon это даёт тона макета `#2a4477 → #1a2a48 → #111a2c → #0c1220` с точностью ±3 в канале.

- [ ] **Step 1: Write the failing test** — `scripts/verify-stage-tones.mjs`:

```js
#!/usr/bin/env node
/**
 * Tests for the Floating Canvas stage tones (src/lib/stage-tones.ts, W3 Этап 1,
 * docs/superpowers/specs/2026-10-08-w3-floating-canvas-implementation.md §2.5):
 * the stage's top tone is the cover colour pulled 30 % towards the canvas, so
 * white text only gains contrast. Usage: npx tsx scripts/verify-stage-tones.mjs
 */
import { palettesByArtworkPath } from '../src/constants/artwork-palettes.ts';
import { contrastRatio } from '../src/lib/palette.ts';
import { STAGE_SHADE, STAGE_VIGNETTE, mixHex, stageTop } from '../src/lib/stage-tones.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('mix 0 → first colour', mixHex('#365ba0', '#0a0a0c', 0) === '#365ba0');
check('mix 1 → second colour', mixHex('#365ba0', '#0a0a0c', 1) === '#0a0a0c');
check('mix 0.3 rounds per channel', mixHex('#365ba0', '#0a0a0c', 0.3) === '#294373');
check('mix clamps t outside 0…1', mixHex('#000000', '#ffffff', 2) === '#ffffff' && mixHex('#000000', '#ffffff', -1) === '#000000');
check('stage top = background 70 % + canvas 30 %', stageTop({ background: '#365ba0', deep: '#1b2946', mini: '#000000', accent: '#ffffff' }) === '#294373');
check('shade stops are ordered 0…1', STAGE_SHADE.locations.every((l, i, a) => l >= 0 && l <= 1 && (i === 0 || l > a[i - 1])));
check('shade and vignette have one colour per stop', STAGE_SHADE.colors.length === STAGE_SHADE.locations.length && STAGE_VIGNETTE.colors.length === STAGE_VIGNETTE.locations.length);
const weakest = Object.values(palettesByArtworkPath)
  .map((p) => contrastRatio('#ffffff', stageTop(p)))
  .reduce((a, b) => Math.min(a, b), Infinity);
check(`white on every stage top ≥ 5:1 (weakest ${weakest.toFixed(2)})`, weakest >= 5);

if (failures > 0) {
  console.error(`\n${failures} stage-tone check(s) failed.`);
  process.exit(1);
}
console.log('\nAll stage-tone checks passed.');
```

- [ ] **Step 2: Run to verify it fails** — `cd apps/mobile && npx tsx scripts/verify-stage-tones.mjs`. Expected: ошибка импорта `stage-tones.ts` (модуля нет).

- [ ] **Step 3: Implement** — `src/lib/stage-tones.ts`:

```ts
import { Colors } from '@/constants/theme';
import type { ArtworkPalette } from '@/lib/palette';

/**
 * Floating Canvas stage colours (W3, spec §2.5): the cover colour pulled 30 %
 * towards the canvas at the top, then a fixed canvas-coloured shade towards
 * the bottom. Darkening only, so white text keeps ≥ 5:1. No glow, no blur.
 */
function channel(hex: string, offset: number): number {
  return parseInt(hex.slice(offset, offset + 2), 16);
}

/** Linear mix of two `#rrggbb` colours; `t` = share of `b`, clamped to 0…1. */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const mixed = [1, 3, 5].map((o) => Math.round(channel(a, o) * (1 - k) + channel(b, o) * k));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function stageTop(palette: ArtworkPalette): string {
  return mixHex(palette.background, Colors.canvas.toLowerCase(), 0.3);
}

/** Vertical shade over the stage top: mid, deep and floor tones of the mockups. */
export const STAGE_SHADE = {
  colors: ['rgba(10, 10, 12, 0)', 'rgba(10, 10, 12, 0.45)', 'rgba(10, 10, 12, 0.7)', 'rgba(10, 10, 12, 0.82)'],
  locations: [0, 0.46, 0.78, 1],
};

/** Edge vignette: the centre (cover, text) reads brighter than the edges. */
export const STAGE_VIGNETTE = {
  colors: ['rgba(8, 10, 16, 0.35)', 'rgba(8, 10, 16, 0)', 'rgba(8, 10, 16, 0)', 'rgba(8, 10, 16, 0.35)'],
  locations: [0, 0.22, 0.78, 1],
};
```

- [ ] **Step 4: Run** — `npx tsx scripts/verify-stage-tones.mjs`. Expected: все `✓ OK`. Если контраст < 5:1 у какой-то палитры — не ослаблять проверку, а увеличить долю фона в `stageTop` и повторить.

- [ ] **Step 5: Фон сцены** — в `player-background.tsx` анимировать `stageTop` соседей вместо `background` и заменить градиент:

```tsx
export function PlayerBackground({ style }: { style?: ViewStyle }) {
  const { pos, prev, current, next } = useNeighborPalettes();
  const tops = useMemo(() => ({ prev: stageTop(prev), current: stageTop(current), next: stageTop(next) }), [prev, current, next]);
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: paletteColor(carouselPos.value, pos, tops.prev, tops.current, tops.next),
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, colorStyle]} />
      <LinearGradient colors={STAGE_SHADE.colors} locations={STAGE_SHADE.locations} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={STAGE_VIGNETTE.colors} locations={STAGE_VIGNETTE.locations} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
```

Обновить комментарий компонента (четыре тона + виньетка, W3 §2.5). Если TypeScript требует кортеж для `colors` у `LinearGradient`, объявить константы `as const`.

- [ ] **Step 6: Verify** — `pnpm --filter @mmusic/mobile test && pnpm --filter @mmusic/mobile typecheck && pnpm --filter @mmusic/mobile lint`. В браузере 390 × 844: Horizon → Now Playing; цвет сцены совпадает с `iphone/now-playing.png`; свайп обложки — цвет плавно идёт за пальцем; мини-плеер не изменился.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/lib/stage-tones.ts apps/mobile/scripts/verify-stage-tones.mjs apps/mobile/package.json apps/mobile/src/components/player/player-background.tsx
git commit -m "W3 stage 1: Floating Canvas stage tones (four tones + vignette) with contrast tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Геометрия перехода сцена → плеер

**Files:**
- Create: `apps/mobile/src/lib/stage-math.ts`
- Create: `apps/mobile/scripts/verify-stage-math.mjs`
- Modify: `apps/mobile/package.json` (`&& tsx scripts/verify-stage-math.mjs`)

**Interfaces:**
- Produces: `type Rect = { x: number; y: number; width: number; height: number }`; `clamp01(v: number): number`; `lerpRect(from: Rect, to: Rect, p: number): Rect`; `homeChromeOpacity(p: number): number`; `homeChromeOffset(p: number): number`; `playerChromeOpacity(p: number): number`; `playerChromeOffset(p: number): number`. Все — worklet-функции (`'worklet'` первой строкой).

Раскадровка (`iphone/transition-storyboard.png`): элементы Home уходят вниз на 90 pt и гаснут к p ≈ 0.31; элементы плеера поднимаются на 40 pt и проявляются с p ≈ 0.54 до p ≈ 0.96.

- [ ] **Step 1: Write the failing test** — `scripts/verify-stage-math.mjs` (шапка, `check` и окончание — как в задаче 1):

```js
import {
  clamp01, homeChromeOffset, homeChromeOpacity, lerpRect, playerChromeOffset, playerChromeOpacity,
} from '../src/lib/stage-math.ts';

const near = (a, b) => Math.abs(a - b) < 1e-6;
const home = { x: 67, y: 120, width: 256, height: 256 };
const player = { x: 35, y: 112, width: 320, height: 320 };

check('clamp01 keeps 0…1', clamp01(-0.5) === 0 && clamp01(0.4) === 0.4 && clamp01(3) === 1);
check('cover at p=0 is the stage cover', JSON.stringify(lerpRect(home, player, 0)) === JSON.stringify(home));
check('cover at p=1 is the player cover', JSON.stringify(lerpRect(home, player, 1)) === JSON.stringify(player));
check('cover halfway is the midpoint', near(lerpRect(home, player, 0.5).width, 288) && near(lerpRect(home, player, 0.5).x, 51));
check('cover progress is clamped (spring overshoot)', JSON.stringify(lerpRect(home, player, 1.2)) === JSON.stringify(player));
check('home chrome visible at rest', homeChromeOpacity(0) === 1 && homeChromeOffset(0) === 0);
check('home chrome gone by p=0.32', homeChromeOpacity(0.32) === 0);
check('home chrome slides 90 down when open', homeChromeOffset(1) === 90);
check('player chrome hidden until p=0.54', playerChromeOpacity(0.54) === 0);
check('player chrome fully in by p=0.96', playerChromeOpacity(0.96) === 1);
check('player chrome rises from 40 below', playerChromeOffset(0) === 40 && playerChromeOffset(1) === 0);
check('no frame shows both chromes', [0.1, 0.2, 0.3, 0.4, 0.5].every((p) => homeChromeOpacity(p) === 0 || playerChromeOpacity(p) === 0));
```

- [ ] **Step 2: Run** — `npx tsx scripts/verify-stage-math.mjs`. Expected: ошибка импорта.

- [ ] **Step 3: Implement** — `src/lib/stage-math.ts`:

```ts
/**
 * Home stage → Now Playing in one motion (W3 spec §4 Этап 1 п. 8; storyboard
 * docs/superpowers/specs/w3-concepts/iphone/transition-storyboard.png). `p` is
 * the shared `expandProgress`: 0 = stage on Home, 1 = Now Playing.
 */
export type Rect = { x: number; y: number; width: number; height: number };

export function clamp01(v: number): number {
  'worklet';
  return Math.min(1, Math.max(0, v));
}

/** The cover between its stage and player places; springs may overshoot, so clamp. */
export function lerpRect(from: Rect, to: Rect, p: number): Rect {
  'worklet';
  const k = clamp01(p);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    width: from.width + (to.width - from.width) * k,
    height: from.height + (to.height - from.height) * k,
  };
}

/** Home's title, controls and shelf leave first… */
export function homeChromeOpacity(p: number): number {
  'worklet';
  return clamp01(1 - p * 3.2);
}
export function homeChromeOffset(p: number): number {
  'worklet';
  return clamp01(p) * 90;
}

/** …the player's chrome arrives late, so the two never overlap. */
export function playerChromeOpacity(p: number): number {
  'worklet';
  return clamp01(p * 2.4 - 1.3);
}
export function playerChromeOffset(p: number): number {
  'worklet';
  return (1 - clamp01(p)) * 40;
}
```

- [ ] **Step 4: Run** — Expected: все `✓ OK`.
- [ ] **Step 5: Commit** — `git add apps/mobile/src/lib/stage-math.ts apps/mobile/scripts/verify-stage-math.mjs apps/mobile/package.json`; сообщение `W3 stage 1: stage → player transition geometry with storyboard tests` + трейлер.

---

### Task 3: Текст песни — правило данных и экран Lyrics

**Files:**
- Create: `apps/mobile/src/lib/lyrics-state.ts`
- Create: `apps/mobile/scripts/verify-lyrics-state.mjs`
- Create: `apps/mobile/src/components/player/player-subheader.tsx`
- Create: `apps/mobile/src/components/player/player-transport.tsx`
- Modify: `apps/mobile/src/app/player/lyrics.tsx` (полная замена разметки; выбор строки переезжает в `lyrics-state`)
- Modify: `apps/mobile/package.json` (`&& tsx scripts/verify-lyrics-state.mjs`)

**Interfaces:**
- Produces:
  - `type LyricsState = { kind: 'synced'; lines: LyricLine[] } | { kind: 'demo-instrumental' } | { kind: 'none' }`;
  - `lyricsStateFor(trackId: TrackId | undefined): LyricsState`;
  - `activeLineIndex(lines: LyricLine[], progressMs: number): number` (−1 до первой метки);
  - `LYRICS_EMPTY: Record<'demo-instrumental' | 'none', { title: string; hint: string }>`;
  - `PlayerSubHeader({ active }: { active: 'lyrics' | 'queue' })` — обложка 36 pt, название, исполнитель, ⌄; ниже переключатель Lyrics / Queue (`router.replace`, история не растёт);
  - `PlayerTransport()` — `SeekBar` + ⏮ Play ⏭, те же подписи доступности и состояния `unavailable` / `loading` / `error`, что в Now Playing.
- Consumes: `PlayerBackground` (задача 1).

Правило (спецификация §2.4, OQ-W3-1 по рекомендации): текст в каталоге → `synced`; иначе демо-аудио → `demo-instrumental`; иначе `none`.

- [ ] **Step 1: Write the failing test** — `scripts/verify-lyrics-state.mjs` (шапка, `check` и окончание — как в задаче 1):

```js
import { hasDemoAudio } from '../src/audio/demo-audio.ts';
import { LYRICS_EMPTY, activeLineIndex, lyricsStateFor } from '../src/lib/lyrics-state.ts';
import { getLyricsForTrack, tracks } from '../src/mocks/index.ts';

const mirage = lyricsStateFor('midnight-mirage');
check('catalog lyrics win (OQ-W3-1): Midnight Mirage is synced', mirage.kind === 'synced' && mirage.lines.length === 11);
check('demo audio without lyrics → instrumental empty state', lyricsStateFor('horizon').kind === 'demo-instrumental');
const plain = tracks.find((t) => !hasDemoAudio(t.id) && !getLyricsForTrack(t.id));
check(`no lyrics, no demo audio → none (${plain?.id})`, plain !== undefined && lyricsStateFor(plain.id).kind === 'none');
check('nothing playing → none', lyricsStateFor(undefined).kind === 'none');
check('approved demo copy, verbatim',
  LYRICS_EMPTY['demo-instrumental'].title === 'Lyrics unavailable for demo audio' &&
  LYRICS_EMPTY['demo-instrumental'].hint === 'This demo recording is instrumental.');
check('existing empty copy kept', LYRICS_EMPTY.none.title === 'Lyrics unavailable');

const lines = [{ timeMs: 1000, text: 'a' }, { timeMs: 8000, text: 'b' }, { timeMs: 16000, text: 'c' }];
check('before the first line → -1', activeLineIndex(lines, 999) === -1);
check('exactly on a timestamp → that line', activeLineIndex(lines, 8000) === 1);
check('just before the next timestamp → previous line', activeLineIndex(lines, 15999) === 1);
check('after the last line → last', activeLineIndex(lines, 999999) === 2);
check('no lines → -1', activeLineIndex([], 5000) === -1);
```

- [ ] **Step 2: Run** — Expected: ошибка импорта `lyrics-state.ts`.

- [ ] **Step 3: Implement** — `src/lib/lyrics-state.ts`:

```ts
import { hasDemoAudio } from '@/audio/demo-audio';
import { getLyricsForTrack, type LyricLine, type TrackId } from '@/mocks';

/**
 * Which lyrics a track may show (W3 spec §2.4): only catalog lyrics, never
 * invented text. Demo recordings are instrumental, so a demo track without
 * catalog lyrics says so instead of the generic message.
 */
export type LyricsState = { kind: 'synced'; lines: LyricLine[] } | { kind: 'demo-instrumental' } | { kind: 'none' };

export const LYRICS_EMPTY = {
  'demo-instrumental': { title: 'Lyrics unavailable for demo audio', hint: 'This demo recording is instrumental.' },
  none: { title: 'Lyrics unavailable', hint: "Synchronized lyrics haven't been added for this track yet." },
} as const;

export function lyricsStateFor(trackId: TrackId | undefined): LyricsState {
  if (!trackId) return { kind: 'none' };
  const lines = getLyricsForTrack(trackId);
  if (lines && lines.length > 0) return { kind: 'synced', lines };
  return hasDemoAudio(trackId) ? { kind: 'demo-instrumental' } : { kind: 'none' };
}

/** The line whose timestamp was passed last; -1 before the first one. */
export function activeLineIndex(lines: LyricLine[], progressMs: number): number {
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].timeMs <= progressMs; i += 1) index = i;
  return index;
}
```

- [ ] **Step 4: Run** — Expected: все `✓ OK`.

- [ ] **Step 5: Экран Lyrics** — переписать `app/player/lyrics.tsx` по `iphone/lyrics.png`:
  - фон `PlayerBackground`;
  - сверху `PlayerSubHeader active="lyrics"`;
  - снизу `PlayerTransport`.
  - Содержимое по `lyricsStateFor(track?.id)`:
    - `synced` → `ScrollView` со строками по левому краю: текущая 32 pt белая (`display-lg-mobile`, `fontSize: 32, lineHeight: 40`), соседние 28 pt с прозрачностью 0.55, остальные 28 pt с прозрачностью 0.32; коралловую полоску со свечением убрать;
    - `demo-instrumental` / `none` → `EmptyState icon="lyrics"` с текстами из `LYRICS_EMPTY`.
  - Автопрокрутка: при смене `activeIndex` — `scrollTo({ y: lineY - viewportHeight * 0.35, animated: !reduceMotion })`; `lineY` из `onLayout` строк. После ручной прокрутки (`onScrollBeginDrag`) автопрокрутка ставится на паузу на 4 с (`setTimeout`, очистка при размонтировании).
  - **Удаляются:** нижние вкладки Lyrics / Audio / Queue (Audio остаётся в Now Playing и в ⋯; Queue — в переключателе) и кнопка Share в шапке (Share track — в листе Options через ⋯ в Now Playing).
  - Жест закрытия по тексту не вешать (компромисс 5 iPhone-документа): закрытие — ⌄ и Back.

- [ ] **Step 6: Verify в браузере 390 × 844:**
  - Midnight Mirage → Lyrics: строки подсвечиваются по времени, текущая держится на трети экрана, ручная прокрутка не дёргается;
  - Horizon → дословно «Lyrics unavailable for demo audio» / «This demo recording is instrumental.»;
  - трек без звука → «Lyrics unavailable»;
  - прямая ссылка `/player/lyrics` при холодном старте → пустое состояние и ⌄ ведёт на Home;
  - Play / Pause, ⏮ ⏭, перемотка работают;
  - переключатель ведёт на Queue без роста истории (Back из Queue → Now Playing).

- [ ] **Step 7: Commit** — все файлы задачи; сообщение `W3 stage 1: lyrics show only catalog text, demo-audio empty state, shared player sub-header and transport` + трейлер.

---

### Task 4: Queue — общий заголовок и управление

**Files:**
- Modify: `apps/mobile/src/app/player/queue.tsx`

**Interfaces:** Consumes `PlayerSubHeader`, `PlayerTransport`, `PlayerBackground` (задачи 1, 3).

- [ ] **Step 1:** Заменить шапку «Playback Queue» на `PlayerSubHeader active="queue"`.
- [ ] **Step 2:** Добавить `PlayerTransport` под списком.
- [ ] **Step 3:** Фон — `PlayerBackground`.
- [ ] **Step 4: Сохранить всё содержимое списка:**
  - Now playing (название кораллом, как в `iphone/queue.png`) и ♡;
  - ⋯ текущего трека — перенести в строку Now playing, раз шапки больше нет;
  - Next по порядку воспроизведения с учётом shuffle;
  - Autoplay;
  - удаление из очереди;
  - тап по строке — `playFromQueueIndex`.
- [ ] **Step 5: Verify 390 × 844:**
  - порядок с shuffle совпадает со следующими треками;
  - тап по треку переключает и обложку, и цвет;
  - autoplay переключается;
  - удаление работает;
  - ⋯ открывает Options;
  - прямая ссылка `/player/queue` без трека → существующее пустое состояние и ⌄.
- [ ] **Step 6: Commit** — `W3 stage 1: queue uses the shared player header and persistent transport` + трейлер.

---

### Task 5: Now Playing на телефоне

**Files:**
- Modify: `apps/mobile/src/app/player/now-playing.tsx`

**Interfaces:** Consumes `lyricsStateFor`, `activeLineIndex` (задача 3).

По `iphone/now-playing.png`:

- [ ] **Step 1: Shuffle и repeat** — `iconSize` 22, цвет `rgba(255,255,255,0.56)` в выключенном состоянии, коралл во включённом. Подписи доступности без изменений.
- [ ] **Step 2: Тихий ряд** — `actionBar` без подложки (`backgroundColor` убрать): иконка над подписью, Lyrics / Queue / Support / Audio, цели ≥ 44 pt.
- [ ] **Step 3: Строка текста** — между транспортом и рядом, только если `lyricsStateFor(track.id).kind === 'synced'`:
  - подпись «Lyrics» (`label-sm`, 0.56) и текущая строка (`body-lg`, центр, `numberOfLines={1}`);
  - до первой метки — первая строка;
  - тап открывает `/player/lyrics`;
  - иначе блок не рендерится и места не занимает.
- [ ] **Step 4: Вертикальный ритм** — обложка → название `Spacing.xl`; название → шкала `Spacing.lg`; шкала → транспорт `Spacing.lg`; транспорт → строка текста `Spacing.lg`; ряд прижат к низу (`marginTop: 'auto'`, отступ снизу `Spacing.md`).
- [ ] **Step 5: Не трогать:**
  - `usePlayerSheet` (свайп вниз, Back, Esc);
  - `ArtworkCarousel`;
  - `SeekBar`;
  - метку Demo audio;
  - ⋯ → Options (Add to playlist остаётся там).
- [ ] **Step 6: Verify 390 × 844 и 360 × 740:**
  - нет обрезания и прокрутки;
  - свайп обложки, свайп вниз, перемотка, все кнопки работают;
  - строка текста есть у Midnight Mirage и отсутствует у Horizon и у треков без звука;
  - reduce motion.
- [ ] **Step 7: Commit** — `W3 stage 1: quieter Now Playing controls, lyric line only for real lyrics` + трейлер.

---

### Task 6: Пилюля навигации и капсула

**Files:**
- Create: `apps/mobile/src/components/nav/floating-tab-bar.tsx`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/components/mini-player.tsx` (стили, положение, видимость; жесты не менять)
- Modify: `apps/mobile/src/state/player-surface.ts` (добавить `stageVisible`)

**Interfaces:**
- Produces:
  - `FloatingTabBar(props: TabBarProps)`, где `type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]` (без импорта `@react-navigation/*` — его нет в прямых зависимостях);
  - `PILL_HEIGHT = 56`, `PILL_BOTTOM_GAP = 8`;
  - `FLOATING_NAV_CLEARANCE = PILL_BOTTOM_GAP + PILL_HEIGHT + 8 + 64 + 16` (пилюля + капсула + отступы — нижний отступ списков);
  - `stageVisible = makeMutable(false)` в `player-surface.ts`.

- [ ] **Step 1: Пилюля** — `FloatingTabBar`:
  - плавающая пилюля по центру, `bottom: insets.bottom + PILL_BOTTOM_GAP`;
  - сплошной `#141418`, граница `rgba(255,255,255,0.08)`, радиус `Radii.full`, тень как у мини-плеера;
  - три пункта Home / Search / Library (иконки как сейчас): иконка над подписью, активный — коралл;
  - `accessibilityRole="tab"`, `accessibilityState={{ selected }}`;
  - нажатие повторяет стандартную панель: `navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })`, затем `navigation.navigate(route.name)`, если событие не отменено и вкладка не активна.
- [ ] **Step 2: Подключение** — в `(tabs)/_layout.tsx`: `tabBar={(props) => <FloatingTabBar {...props} />}`; `tabBarStyle`, `TAB_BAR_HEIGHT` убрать.
  - Капсула: `bottom: insets.bottom + PILL_BOTTOM_GAP + PILL_HEIGHT + 8`.
  - Экранам вкладок добавить нижний отступ `FLOATING_NAV_CLEARANCE` там, где сейчас учитывается панель (найти: `grep -rn "TAB_BAR_HEIGHT\|MINI_PLAYER\|paddingBottom" src/app/\(tabs\)`).
- [ ] **Step 3: Капсула** — `mini-player.tsx`:
  - радиус `Radii.full`, обложка остаётся квадратной (`Radii.DEFAULT`), как в `iphone/home-scrolled.png`;
  - фон — существующий `tintStyle` (палитра), граница и тень как сейчас.
  - Видимость: в `wrapStyle` умножить `opacity` на `withTiming(stageVisible.value ? 0 : 1, { duration: 160 })` и при `stageVisible` выставить `pointerEvents="none"` (через `useAnimatedProps` или состояние). Пока задача 7 не сделана, `stageVisible === false` и поведение прежнее.
  - Жесты, тап, подписи — без изменений.
- [ ] **Step 4: Verify 390 × 844:**
  - переход между вкладками сохраняет их стеки;
  - Search → Results → назад;
  - капсула над пилюлей: тап, свайп ← → и ↑ работают как раньше;
  - Artist / Album / Playlist (`MiniPlayerOverlay`) не изменились, кроме формы капсулы;
  - контент не прячется под пилюлей в конце списков.
- [ ] **Step 5: Commit** — `W3 stage 1: floating nav pill and player capsule (same mini-player gestures)` + трейлер.

---

### Task 7: Сцена на Home

**Files:**
- Create: `apps/mobile/src/components/home/home-stage.tsx`
- Modify: `apps/mobile/src/app/(tabs)/home/index.tsx`
- Modify: `apps/mobile/src/components/player/artwork-carousel.tsx` (необязательный `onPress`)
- Modify: `apps/mobile/src/state/player-surface.ts` (добавить `stageCoverRect`)

**Interfaces:**
- Produces:
  - `HomeStage()`;
  - `ArtworkCarousel({ size, paused, onPress? }: { size: number; paused: boolean; onPress?: () => void })`;
  - `stageCoverRect = makeMutable<Rect | null>(null)` (координаты окна).
- Consumes: `PlayerBackground` (1), `Rect` (2), `stageVisible` (6), `SeekBar`, `CircleButton`.

- [ ] **Step 1: Тап по обложке** — в `ArtworkCarousel`, только если передан `onPress`, собрать `Gesture.Exclusive(pan, Gesture.Tap().maxDistance(8).onEnd(() => scheduleOnRN(onPress)))`. Без `onPress` — прежний `pan`, поведение Now Playing не меняется. Ref на `onPress` обновлять через `useRef`, чтобы жест строился один раз (комментарий в файле объясняет, почему жест нельзя пересобирать).
- [ ] **Step 2: `HomeStage`** — по `iphone/home.png`:
  - `PlayerBackground` во всю ширину;
  - существующий `Header` (логотип, уведомления, профиль) поверх сцены;
  - `ArtworkCarousel size={256} onPress={openPlayer}`;
  - название (`headline-lg`) и исполнитель;
  - ⏮ `CircleButton` 64 ⏭;
  - `SeekBar` (как в Now Playing);
  - тихий ряд ♡ Liked · Lyrics · Up next (Up next → `/player/queue`).
- [ ] **Step 3: Видимость сцены** — на `ScrollView` Home `onScroll` (`scrollEventThrottle={16}`): `stageVisible.value = scrollY < stageHeight - 80`. На уходе с вкладки (`useFocusEffect`) — `stageVisible.value = false`, чтобы на Search / Library капсула была видна.
- [ ] **Step 4: Прямоугольник обложки и пустое состояние:**
  - `measureInWindow` обложки после раскладки и в `onScroll` → `stageCoverRect.value`; при уходе с вкладки → `null`.
  - **Пустое состояние (OQ-W3-2):** без трека `HomeStage` не рендерится; Home начинается с существующих разделов (For you, Late Night Flow…), как сейчас; капсулы нет.
  - Все существующие разделы Home остаются в прежнем порядке под сценой.
- [ ] **Step 5: Verify 390 × 844 (Review Focus 1, 2, 4):**
  - вертикальная прокрутка, начатая на обложке, прокручивает страницу и не меняет трек и не открывает плеер;
  - горизонтальный свайп меняет трек и цвет;
  - тап открывает плеер;
  - капсула появляется только когда сцена ушла, без одновременного показа;
  - холодный старт: сцены и капсулы нет, «For you» сверху;
  - переход на Search показывает капсулу;
  - Now Playing: свайп обложки работает как раньше (без `onPress`).
- [ ] **Step 6: Commit** — `W3 stage 1: Home stage with the playing track; capsule only when the stage is off-screen` + трейлер.

---

### Task 8: Переход сцена → Now Playing

**Files:**
- Modify: `apps/mobile/src/state/player-surface.ts` (добавить `expandOrigin`, `playerCoverRect`)
- Modify: `apps/mobile/src/components/player/use-player-sheet.ts`
- Modify: `apps/mobile/src/app/player/now-playing.tsx` (измерение обложки)
- Modify: `apps/mobile/src/components/home/home-stage.tsx`
- Modify: `apps/mobile/src/components/nav/floating-tab-bar.tsx`
- Modify: `apps/mobile/src/components/mini-player.tsx` (выставить `expandOrigin = 'mini'`)

**Interfaces:**
- Produces: `expandOrigin = makeMutable<'mini' | 'stage'>('mini')`; `playerCoverRect = makeMutable<Rect | null>(null)`.
- Consumes: `lerpRect`, `homeChromeOpacity`, `homeChromeOffset`, `playerChromeOpacity`, `playerChromeOffset` (2); `stageCoverRect`, `stageVisible` (6–7).

- [ ] **Step 1: Происхождение раскрытия** — `HomeStage` перед `router.push` ставит `expandOrigin.value = 'stage'`. Мини-плеер ставит `'mini'` в `openPlayer` и при начале свайпа вверх. `use-player-sheet` при размонтировании сбрасывает в `'mini'`.
- [ ] **Step 2: Плеер из сцены** — в `use-player-sheet.ts`, если `expandOrigin.value === 'stage'` и оба прямоугольника известны:
  - `sheetStyle` — без `translateY` и скругления; прозрачность фона `clamp01(p * 3)`;
  - `chromeStyle` — `opacity: playerChromeOpacity(p)`, `translateY: playerChromeOffset(p)`;
  - `artStyle` — `translateX / translateY / scale` из `lerpRect(stageCoverRect, playerCoverRect, p)` относительно `playerCoverRect` (scale = width / playerCoverRect.width).
  - `playerCoverRect` пишет Now Playing (`onLayout` + `measureInWindow` обёртки обложки).
  - Если прямоугольника нет — прежняя анимация из капсулы.
  - Ветка `'mini'` — прежний код без изменений.
- [ ] **Step 3: Home уходит** — в `HomeStage` элементы под обложкой: `opacity: homeChromeOpacity(expandProgress.value)`, `translateY: homeChromeOffset(…)` — только при `expandOrigin.value === 'stage'`. Пилюля: `translateY: expandProgress.value * (PILL_HEIGHT + 24)` при том же условии.
- [ ] **Step 4: Обратно** — свайп вниз, ⌄, Back, Esc уже ведут `expandProgress` к 0 (`beforeRemove`), поэтому обратный путь получается автоматически.
  - Если за время в плеере сменился трек, сцена уже показывает новый — `carouselPos` общий.
  - Если сцена ушла из вида (`stageVisible === false`), в `beforeRemove` переключить `expandOrigin` на `'mini'`, чтобы закрытие шло к капсуле.
- [ ] **Step 5: Reduce motion** — ветка `'stage'` при `reduceMotion && !dragging` даёт только проявление (как сейчас).
- [ ] **Step 6: Verify 390 × 844** — запись кадров Playwright, 4 кадра около 0 / 120 / 230 / 350 мс, сравнить с `iphone/transition-storyboard.png`:
  - обложка не исчезает и не прыгает;
  - нет кадра с двумя названиями;
  - капсула не мигает;
  - открытие из капсулы и из карточек «For you» — прежнее;
  - свайп вниз ведёт обратно к сцене, а после прокрутки Home — к капсуле.
- [ ] **Step 7: Commit** — `W3 stage 1: the Home stage grows into Now Playing in one motion` + трейлер.

---

### Task 9: Проверка этапа и отчёт

**Files:**
- Create: `docs/superpowers/specs/2026-10-08-w3-stage1-report.md` (русский)
- Create: `docs/superpowers/specs/w3-stage1/*.png` (скриншоты)

- [ ] **Step 1: Автоматика** — `pnpm test`, `pnpm typecheck`, `pnpm lint` (корень, turbo), `pnpm --filter @mmusic/mobile build:web`. Все зелёные; вывод — в отчёт.
- [ ] **Step 2: Браузер** — `preview:web` на свободном порту (не 8082). Пройти спецификацию §6.2 на 390 × 844 и 360 × 740, включая reduce motion и блокировку автозапуска. Консоль — 0 ошибок гидратации на всех маршрутах.
- [ ] **Step 3: Регрессия** — чек-лист `2026-10-08-player-gestures-plan.md` целиком. Скриншоты Library, Search, Artist, Album, Playlist, Profile, листов до и после (отличия — только пилюля и капсула).
- [ ] **Step 4: Сравнение с макетами** — `iphone/home.png`, `home-scrolled.png`, `now-playing.png`, `lyrics.png`, `queue.png`, раскадровка — пары «макет / реализация» в отчёте.
- [ ] **Step 5: Отчёт** — что сделано, проверки, отличия от макетов с причинами, известные ограничения (нативное приложение не проверялось — только сайт).
- [ ] **Step 6: Commit** — отчёт и скриншоты; сообщение `docs: W3 stage 1 report — iPhone Floating Canvas checks and screenshots` + трейлер.

После этого — пауза: этап 2 (планшет) начинается только после вашей приёмки и утверждения его плана.
