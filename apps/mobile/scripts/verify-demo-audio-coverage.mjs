#!/usr/bin/env node
/**
 * Demo Audio Experience: every catalog track has honestly-disclosed,
 * verifiably-licensed, actually-present demo audio. Usage:
 * npx tsx scripts/verify-demo-audio-coverage.mjs
 */
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { tracks } from '../src/mocks/tracks.ts';
import { demoAudioCredits, hasDemoAudio } from '../src/audio/demo-audio.ts';
import { demoAudioKeys, KYRGYZ_TRACK_IDS, PENDING_AUDIO_TRACK_IDS } from '../src/audio/demo-audio-keys.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', 'assets', 'audio');

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const demoSourcesSrc = await import('node:fs/promises').then((fs) => fs.readFile(join(__dirname, '..', 'src', 'audio', 'demo-sources.ts'), 'utf8'));
// PENDING_AUDIO_TRACK_IDS and KYRGYZ_TRACK_IDS live in the pure
// demo-audio-keys.ts (W2.4a), so they are imported directly.
check('PENDING_AUDIO_TRACK_IDS export found in demo-audio-keys.ts', Array.isArray(PENDING_AUDIO_TRACK_IDS) && PENDING_AUDIO_TRACK_IDS.length > 0);
check('every PENDING_AUDIO_TRACK_IDS entry is a catalog track id', PENDING_AUDIO_TRACK_IDS.every((id) => tracks.some((t) => t.id === id)));

// KYRGYZ_TRACK_IDS scopes the Kevin MacLeod / CC BY 4.0 checks below: real
// Kyrgyz recordings are licensed/credited separately, per
// assets/audio/kyrgyz/PENDING.md step 7.
check('KYRGYZ_TRACK_IDS export found in demo-audio-keys.ts', Array.isArray(KYRGYZ_TRACK_IDS) && KYRGYZ_TRACK_IDS.length > 0);

// Every catalog track must have a demo-audio credit (Demo Audio Experience),
// except tracks explicitly pending real licensed audio (2026-10-12 Kyrgyz
// catalog plan) — those must instead have NO credit at all, never a fake one.
for (const track of tracks) {
  if (PENDING_AUDIO_TRACK_IDS.includes(track.id)) {
    check(`"${track.title}" (${track.id}) is pending audio and correctly has no demo-audio credit`, !hasDemoAudio(track.id));
  } else {
    check(`"${track.title}" (${track.id}) has demo audio`, hasDemoAudio(track.id));
  }
}
check('no stray demoAudioCredits entries for ids not in the catalog', Object.keys(demoAudioCredits).every((id) => tracks.some((t) => t.id === id)));

// Every credit must name a real license and point at a real author — the
// honesty principle this whole feature exists to uphold. The Kevin MacLeod /
// CC BY 4.0 checks apply only to the original demo recordings: real Kyrgyz
// tracks are licensed/credited separately (PENDING.md step 7) and must not
// be forced to falsely claim that license.
for (const [id, credit] of Object.entries(demoAudioCredits)) {
  check(`"${id}": credit has a non-empty originalTitle`, typeof credit.originalTitle === 'string' && credit.originalTitle.length > 0);
  if (!KYRGYZ_TRACK_IDS.includes(id)) {
    check(`"${id}": credit names Kevin MacLeod as author`, credit.author === 'Kevin MacLeod');
    check(`"${id}": credit is CC BY 4.0`, credit.licenseUrl === 'https://creativecommons.org/licenses/by/4.0/');
  }
  check(`"${id}": credit declares isInstrumental explicitly (Lyrics Demo Experience)`, typeof credit.isInstrumental === 'boolean');
}

// No two differently-titled-or-credited catalog tracks may silently share one
// recording without disclosure — each credited originalTitle must be unique.
const titles = Object.values(demoAudioCredits).map((c) => c.originalTitle);
check('every demo recording title is used by exactly one catalog track (no undisclosed reuse)', new Set(titles).size === titles.length);

// DEMO_SOURCES (the actual require()'d files) must exist on disk, one per
// credited track, under assets/audio. Each track's audio key (demoAudioKeys)
// must have a live `require()` in the audioSources table — read as text since
// it's a Metro-style `require()` map that can't be imported directly from
// plain Node. Strip commented-out lines first so a disabled entry can't look
// like a live one.
const activeDemoSourcesSrc = demoSourcesSrc
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');
const requiredFiles = new Set(
  [...activeDemoSourcesSrc.matchAll(/'audio:([^']+)':\s*require\('\.\.\/\.\.\/assets\/audio\/([^']+)'\)/g)].filter(([, key, file]) => key === file).map(([, key]) => key),
);
const allEntries = Object.entries(demoAudioKeys)
  .filter(([, key]) => requiredFiles.has(key.slice('audio:'.length)))
  .map(([id, key]) => [undefined, id, key.slice('audio:'.length)]);
const allEntryIds = allEntries.map(([, id]) => id);

check('DEMO_SOURCES has exactly one entry per credited track (no extras, none missing)', new Set(allEntryIds).size === allEntryIds.length && allEntryIds.length === Object.keys(demoAudioCredits).length && allEntryIds.every((id) => id in demoAudioCredits));

const filesUsed = allEntries.map(([, , file]) => file);
check('every DEMO_SOURCES entry points at a distinct file (no two tracks silently sharing one recording)', new Set(filesUsed).size === filesUsed.length);

for (const id of Object.keys(demoAudioCredits)) {
  const match = allEntries.find(([, entryId]) => entryId === id);
  check(`"${id}" has a DEMO_SOURCES require() entry`, !!match);
  if (match) {
    const file = match[2];
    const filePath = join(AUDIO_DIR, file);
    check(`"${id}"'s audio file (${file}) exists on disk`, existsSync(filePath));
    if (existsSync(filePath)) check(`"${id}"'s audio file (${file}) is non-empty`, statSync(filePath).size > 0);
  }
}

if (failures > 0) {
  console.error(`\n${failures} demo-audio-coverage check(s) failed.`);
  process.exit(1);
}
console.log('\nAll demo-audio-coverage checks passed.');
