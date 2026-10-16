#!/usr/bin/env node
/**
 * Promotion (Stitch) per-screen copy tables: every table in
 * src/components/promotion-stitch/strings/*.ts has identical EN/RU key sets and
 * no empty strings. Usage: npx tsx scripts/verify-promotion-stitch-strings.mjs
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'promotion-stitch', 'strings');

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
check('at least one Stitch strings table exists', files.length > 0);

for (const file of files) {
  const mod = await import(pathToFileURL(join(dir, file)).href);
  for (const [name, table] of Object.entries(mod)) {
    if (!table || typeof table !== 'object' || !('en' in table) || !('ru' in table)) continue;
    const en = Object.keys(table.en).sort();
    const ru = Object.keys(table.ru).sort();
    check(`${file} ${name}: en and ru have the same keys`, en.length === ru.length && en.every((k, i) => k === ru[i]));
    check(`${file} ${name}: no empty strings`, [...Object.values(table.en), ...Object.values(table.ru)].every((v) => typeof v === 'string' && v.length > 0));
  }
}

if (failures > 0) {
  console.error(`\n${failures} promotion-stitch-strings check(s) failed.`);
  process.exit(1);
}
console.log('\nAll promotion-stitch-strings checks passed.');
