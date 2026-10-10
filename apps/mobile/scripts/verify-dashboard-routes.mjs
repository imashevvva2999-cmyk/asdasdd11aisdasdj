#!/usr/bin/env node
/**
 * Artist Dashboard's own nested routes exist and the old single-file route
 * is gone (replaced by the tabbed shell). Usage: npx tsx scripts/verify-dashboard-routes.mjs
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..', 'src', 'app');

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('old single-file dashboard.tsx is gone (replaced by the dashboard/ folder)', !existsSync(join(APP, 'profile', 'artist', 'dashboard.tsx')));
check('dashboard/_layout.tsx exists', existsSync(join(APP, 'profile', 'artist', 'dashboard', '_layout.tsx')));
check('dashboard/index.tsx (Overview) exists', existsSync(join(APP, 'profile', 'artist', 'dashboard', 'index.tsx')));

if (failures > 0) {
  console.error(`\n${failures} dashboard-routes check(s) failed.`);
  process.exit(1);
}
console.log('\nAll dashboard-routes checks passed.');
