/**
 * Support History dates, hydration-safe (React #418). The static export is
 * rendered on the build machine (UTC on Vercel) and must match the browser's
 * first render exactly, so the static mode is fully deterministic: fixed
 * text built by hand per locale (no Intl — engines differ in spacing), UTC,
 * and month groups only (no "Today": that depends on when the site was
 * built). After hydration the live mode uses the visitor's time zone and
 * relative periods. Covered by scripts/verify-support-dates.mjs.
 */
export type SupportDateMode = { kind: 'static' } | { kind: 'live'; now: Date };

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Parts = { year: number; month: number; day: number; hours: number; minutes: number };

function parts(date: Date, mode: SupportDateMode): Parts {
  return mode.kind === 'static'
    ? { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), hours: date.getUTCHours(), minutes: date.getUTCMinutes() }
    : { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), hours: date.getHours(), minutes: date.getMinutes() };
}

/** "Oct 8, 9:30 PM" (en) / "8 окт, 21:30" (ru — 24-hour clock, the RU convention). */
export function supportDateLabel(iso: string, mode: SupportDateMode, locale: 'en' | 'ru' = 'en'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = parts(date, mode);
  const minutes = String(p.minutes).padStart(2, '0');
  if (locale === 'ru') {
    const hours = String(p.hours).padStart(2, '0');
    return `${p.day} ${MONTHS_RU_SHORT[p.month]}, ${hours}:${minutes}`;
  }
  const hour12 = p.hours % 12 === 0 ? 12 : p.hours % 12;
  return `${MONTHS_EN[p.month]!.slice(0, 3)} ${p.day}, ${hour12}:${minutes} ${p.hours < 12 ? 'AM' : 'PM'}`;
}

/** "Today" / "Last Week" (live only) or "October 2026" ("Октябрь 2026" in ru). */
export function supportPeriodLabel(iso: string, mode: SupportDateMode, locale: 'en' | 'ru' = 'en'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (mode.kind === 'live') {
    const { now } = mode;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date >= startOfToday) return locale === 'ru' ? 'Сегодня' : 'Today';
    if (date.getTime() >= startOfToday.getTime() - WEEK_MS) return locale === 'ru' ? 'На этой неделе' : 'Last Week';
  }
  const p = parts(date, mode);
  return locale === 'ru' ? `${MONTHS_RU[p.month]} ${p.year}` : `${MONTHS_EN[p.month]} ${p.year}`;
}

/** Entries grouped by period, in history order. */
export function groupSupportHistory<T extends { createdAt: string }>(
  entries: readonly T[],
  mode: SupportDateMode,
  locale: 'en' | 'ru' = 'en',
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const label = supportPeriodLabel(entry.createdAt, mode, locale);
    const list = groups.get(label);
    if (list) list.push(entry);
    else groups.set(label, [entry]);
  }
  return [...groups.entries()];
}
