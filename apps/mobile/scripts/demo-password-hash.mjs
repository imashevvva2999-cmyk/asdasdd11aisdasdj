#!/usr/bin/env node
/**
 * Print the SHA-256 hash for the Demo Artist password, for
 * EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256 in the untracked .env.local
 * (see src/demo/demo-config.ts). The password itself is never stored.
 * Usage: node scripts/demo-password-hash.mjs "<password>"
 */
import { createHash } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/demo-password-hash.mjs "<password>"');
  process.exit(1);
}
console.log(createHash('sha256').update(password, 'utf8').digest('hex'));
