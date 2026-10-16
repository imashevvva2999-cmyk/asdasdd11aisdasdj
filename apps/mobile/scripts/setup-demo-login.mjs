#!/usr/bin/env node
/**
 * Interactive setup for the dev-only Demo Artist login (src/demo/demo-config.ts).
 * Asks for a login and a password (typed hidden, entered twice), then writes
 * EXPO_PUBLIC_DEMO_ARTIST_LOGIN and EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256 into
 * the untracked .env.local, replacing previous values and keeping every other
 * line. Only the SHA-256 hash is stored — never the password — and nothing
 * secret is printed. Restart the dev server afterwards.
 *
 * Usage (from apps/mobile): npm run demo:setup
 */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const envFile = process.env.DEMO_ENV_FILE ?? join(import.meta.dirname, '..', '.env.local');
const KEYS = ['EXPO_PUBLIC_DEMO_ARTIST_LOGIN', 'EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256'];
const MARKER = '# Demo Artist login (dev only) — set via `npm run demo:setup`';

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Echo nothing while the password is typed.
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

/** Replace (or append) the demo keys, preserving all other lines. */
export function upsertEnv(text, values) {
  const lines = text.split('\n').filter((line) => line !== MARKER && !KEYS.some((k) => line.startsWith(`${k}=`)));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (lines.length) lines.push('');
  lines.push(MARKER);
  for (const k of KEYS) lines.push(`${k}=${values[k]}`);
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error('Run this in an interactive terminal: npm run demo:setup');
    process.exit(1);
  }
  console.log('Demo Artist login setup (development only).');
  const login = (await ask('Login (e.g. demo@yourdomain.test): ')).trim().toLowerCase();
  if (!login || /\s/.test(login)) {
    console.error('Login must be non-empty and contain no spaces.');
    process.exit(1);
  }
  const password = await ask('Password (min 10 characters, hidden): ', { hidden: true });
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }
  const repeat = await ask('Repeat password: ', { hidden: true });
  if (repeat !== password) {
    console.error('Passwords do not match. Nothing was written.');
    process.exit(1);
  }

  const values = {
    EXPO_PUBLIC_DEMO_ARTIST_LOGIN: login,
    EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256: createHash('sha256').update(password, 'utf8').digest('hex'),
  };
  const current = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  writeFileSync(envFile, upsertEnv(current, values), { mode: 0o600 });
  chmodSync(envFile, 0o600);
  console.log(`Saved login and password hash to ${envFile}.`);
  console.log('Restart the dev server (npx expo start --web --clear), then open /profile/demo-login.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
