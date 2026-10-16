import { sha256Hex } from './sha256';

/**
 * Demo Artist login — development-only credential check.
 *
 * Mmusic has no authentication backend yet, so this is NOT real auth. It is a
 * clearly isolated dev/demo gate:
 *  - Credentials come from the developer's untracked `.env.local`
 *    (`.env*` is gitignored): a login and the SHA-256 hash of the password —
 *    never the password itself. Generate the hash with
 *    `node scripts/demo-password-hash.mjs "<password>"`.
 *  - It is enabled only in development builds (`__DEV__`), so a production
 *    web export / store build renders the login screen as unavailable.
 * Replace with the real auth service once it exists.
 */
// Read only behind __DEV__: production bundles dead-code-strip these, so the
// login and hash never ship in a production/Vercel build (incl. the public
// Guest Preview), even if .env.local is present when exporting. Read at call
// time, not module load: Expo's dev env values are defined at runtime and may
// not exist yet when this module is first imported.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
function configured() {
  return {
    login: IS_DEV ? (process.env.EXPO_PUBLIC_DEMO_ARTIST_LOGIN ?? '').trim().toLowerCase() : '',
    passwordSha256: IS_DEV ? (process.env.EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256 ?? '').trim().toLowerCase() : '',
  };
}

export type DemoLoginAvailability = 'enabled' | 'production' | 'notConfigured';

export function demoLoginAvailability(isDev: boolean = typeof __DEV__ !== 'undefined' && __DEV__): DemoLoginAvailability {
  if (!isDev) return 'production';
  const { login, passwordSha256 } = configured();
  if (!login || !/^[0-9a-f]{64}$/.test(passwordSha256)) return 'notConfigured';
  return 'enabled';
}

/** Compare the entered credentials against the configured login + password
 * hash. Always false when nothing is configured. */
export function verifyDemoCredentials(login: string, password: string, config = configured()): boolean {
  if (!config.login || !config.passwordSha256) return false;
  const loginOk = login.trim().toLowerCase() === config.login;
  const hashOk = sha256Hex(password) === config.passwordSha256;
  return loginOk && hashOk;
}
