import type { ActivityEvent } from '@mmusic/backoffice/domain';

import type { ArmCollections, DemoArtist, DemoUser, Submission } from './types.ts';

/**
 * Fictional ARM demo data. Every artist, release, track and person is invented and marked "(демо)" or uses
 * example.kg; none describes a real artist, a real company or real platform figures. The exception is one labelled demo
 * submission (sub-demo-horizon) built on the app's own fictional catalog track "Horizon". Genres reuse the app's upload
 * genre options plus the catalog's Kyrgyz styles. Decided items come with matching audit events.
 */

const ARTISTS: DemoArtist[] = [
  { id: 'dart-1', mock: true, name: 'Neon Yurta (демо)', genres: ['Electronic'], city: 'Бишкек', submittedAt: '2026-10-19T09:10:00.000Z', status: 'pending', bio: { ru: 'Электроника с сэмплами комуза (вымышленный артист).', en: 'Electronica with komuz samples (fictional artist).' } },
  { id: 'dart-2', mock: true, name: 'Тень Тянь-Шаня (демо)', genres: ['Ambient'], city: 'Каракол', submittedAt: '2026-10-18T14:30:00.000Z', status: 'pending', bio: { ru: 'Горный эмбиент и полевые записи (вымышленный артист).', en: 'Mountain ambient and field recordings (fictional artist).' } },
  { id: 'dart-3', mock: true, name: 'Кара-Суу Бэнд (демо)', genres: ['Rock'], city: 'Ош', submittedAt: '2026-10-10T11:00:00.000Z', status: 'approved', decidedAt: '2026-10-14T10:05:00.000Z', decidedBy: 'staff-arm-1', bio: { ru: 'Гаражный рок из Оша (вымышленная группа).', en: 'Garage rock from Osh (fictional band).' } },
  { id: 'dart-4', mock: true, name: 'DJ Арча (демо)', genres: ['Hip-Hop'], city: 'Бишкек', submittedAt: '2026-10-15T16:45:00.000Z', status: 'changes-requested', decidedAt: '2026-10-17T12:20:00.000Z', decidedBy: 'staff-arm-1', reason: 'Добавьте ссылку на официальную страницу артиста и фото без водяных знаков.', bio: { ru: 'Хип-хоп-продюсер (вымышленный артист).', en: 'Hip-hop producer (fictional artist).' } },
  { id: 'dart-5', mock: true, name: 'Sky Felt (демо)', genres: ['Dream Pop'], city: 'Бишкек', submittedAt: '2026-10-20T08:15:00.000Z', status: 'pending', bio: { ru: 'Дрим-поп-дуэт (вымышленный артист).', en: 'Dream pop duo (fictional artist).' } },
  { id: 'dart-6', mock: true, name: 'Ак-Кула Квартет (демо)', genres: ['Jazz'], city: 'Нарын', submittedAt: '2026-10-09T13:40:00.000Z', status: 'rejected', decidedAt: '2026-10-12T15:00:00.000Z', decidedBy: 'staff-arm-1', reason: 'Профиль дублирует уже существующую демо-заявку этого коллектива.', bio: { ru: 'Джазовый квартет (вымышленный коллектив).', en: 'Jazz quartet (fictional band).' } },
];

const track = (id: string, title: string, artistId: string, genre: string, durationSec: number, submittedAt: string, rest: Partial<Submission> = {}): Submission => ({
  id, mock: true, kind: 'track', title, artistId, genre, durationSec, submittedAt, status: 'pending', ...rest,
});
const release = (id: string, title: string, artistId: string, genre: string, releaseType: Submission['releaseType'], trackCount: number, submittedAt: string, rest: Partial<Submission> = {}): Submission => ({
  id, mock: true, kind: 'release', title, artistId, genre, releaseType, trackCount, submittedAt, status: 'pending', ...rest,
});

const SUBMISSIONS: Submission[] = [
  track('sub-t1', 'Ночной проспект', 'dart-1', 'Electronic', 213, '2026-10-20T18:05:00.000Z', { note: { ru: 'Первый сингл, мастеринг свой.', en: 'Debut single, self-mastered.' } }),
  track('sub-t2', 'Пыль на струнах', 'dart-2', 'Ambient', 254, '2026-10-20T10:40:00.000Z'),
  track('sub-t3', 'Ала-Арча на рассвете', 'dart-2', 'Ambient', 301, '2026-10-19T07:55:00.000Z'),
  track('sub-t4', 'Кара-Суу', 'dart-3', 'Rock', 198, '2026-10-13T12:00:00.000Z', { status: 'approved', decidedAt: '2026-10-15T09:30:00.000Z', decidedBy: 'staff-arm-2' }),
  track('sub-t5', 'Без фильтров', 'dart-4', 'Hip-Hop', 176, '2026-10-21T06:20:00.000Z', { explicit: true }),
  track('sub-t6', 'Войлок и неон', 'dart-5', 'Dream Pop', 232, '2026-10-18T19:10:00.000Z'),
  track('sub-t7', 'Сигнал', 'dart-1', 'Electronic', 187, '2026-10-14T21:00:00.000Z', { status: 'rejected', decidedAt: '2026-10-16T11:45:00.000Z', decidedBy: 'staff-arm-2', reason: 'Обнаружен неразрешённый семпл в начале трека (0:12–0:31).' }),
  track('sub-t8', 'Старый двор', 'dart-3', 'Rock', 205, '2026-10-16T08:30:00.000Z', { status: 'changes-requested', decidedAt: '2026-10-17T10:10:00.000Z', decidedBy: 'staff-arm-2', reason: 'Укажите автора текста и композитора в метаданных трека.' }),
  track('sub-t9', 'Медленный поезд', 'dart-6', 'Jazz', 340, '2026-10-21T05:45:00.000Z'),
  // The one playable demo submission: the app's catalog track "Horizon" (core/mocks/tracks.ts — Solaris Echo, 184 s;
  // genre as in core/demo/demo-fixture.ts) with the demo recording the catalog already plays for it (domain/audio.ts).
  // Only this ARM copy is moderated; the public catalog and the artist's account are untouched. No artist comment:
  // the catalog artist wrote none (the detail page labels the submission via its "Источник" row instead).
  track('sub-demo-horizon', 'Horizon', 'solaris-echo', 'Ambient', 184, '2026-10-21T07:30:00.000Z', { catalogTrackId: 'horizon' }),
  release('sub-r1', 'Огни Бишкека', 'dart-1', 'Electronic', 'ep', 4, '2026-10-20T18:10:00.000Z'),
  release('sub-r2', 'Высокогорье', 'dart-2', 'Ambient', 'album', 9, '2026-10-19T08:00:00.000Z', { note: { ru: 'Альбом записан в Каракольском ущелье.', en: 'Album recorded in the Karakol gorge.' } }),
  release('sub-r3', 'Кара-Суу', 'dart-3', 'Rock', 'single', 1, '2026-10-13T12:05:00.000Z', { status: 'approved', decidedAt: '2026-10-15T09:35:00.000Z', decidedBy: 'staff-arm-2' }),
  release('sub-r4', 'Улица', 'dart-4', 'Hip-Hop', 'ep', 5, '2026-10-21T06:30:00.000Z', { explicit: true }),
  release('sub-r5', 'Мягкие стены', 'dart-5', 'Dream Pop', 'single', 1, '2026-10-17T15:20:00.000Z', { status: 'changes-requested', decidedAt: '2026-10-18T13:00:00.000Z', decidedBy: 'staff-arm-2', reason: 'Обложка содержит чужой логотип — замените обложку.' }),
  release('sub-r6', 'Поздний сет', 'dart-6', 'Jazz', 'album', 8, '2026-10-11T17:00:00.000Z', { status: 'rejected', decidedAt: '2026-10-13T16:25:00.000Z', decidedBy: 'staff-arm-2', reason: 'Релиз уже опубликован другим дистрибьютором (дубликат).' }),
];

const user = (id: string, name: string, email: string, city: string, role: DemoUser['role'], registeredAt: string, lastActiveAt: string, rest: Partial<DemoUser> = {}): DemoUser => ({
  id, mock: true, name, email, city, role, status: 'active', registeredAt, lastActiveAt, ...rest,
});

const USERS: DemoUser[] = [
  user('u-1', 'Айгерим Токтосунова', 'aigerim.t@example.kg', 'Бишкек', 'staff', '2026-03-02T09:00:00.000Z', '2026-10-21T08:00:00.000Z', { staffId: 'staff-arm-1' }),
  user('u-2', 'Нурбек Асанов', 'nurbek.a@example.kg', 'Бишкек', 'staff', '2026-04-11T09:00:00.000Z', '2026-10-21T07:40:00.000Z', { staffId: 'staff-arm-2' }),
  user('u-3', 'Элина Садыкова', 'elina.s@example.kg', 'Бишкек', 'staff', '2026-05-20T09:00:00.000Z', '2026-10-20T17:00:00.000Z', { staffId: 'staff-arm-3' }),
  user('u-4', 'Тимур Жумабаев', 'timur.j@example.kg', 'Бишкек', 'staff', '2026-06-03T09:00:00.000Z', '2026-10-19T12:00:00.000Z', { staffId: 'staff-arm-4' }),
  user('u-5', 'Алина Ким', 'alina.k@example.kg', 'Бишкек', 'staff', '2026-07-15T09:00:00.000Z', '2026-10-20T10:30:00.000Z', { staffId: 'staff-arm-5' }),
  user('u-6', 'Бекболот Сыдыков', 'bekbolot@example.kg', 'Бишкек', 'listener', '2026-06-21T14:00:00.000Z', '2026-10-21T06:10:00.000Z'),
  user('u-7', 'Айжан Мамбетова', 'aijan@example.kg', 'Ош', 'listener', '2026-07-02T18:30:00.000Z', '2026-10-20T21:15:00.000Z'),
  user('u-8', 'Глеб Орлов', 'gleb@example.kg', 'Бишкек', 'listener', '2026-08-09T11:00:00.000Z', '2026-10-15T09:00:00.000Z', { status: 'suspended', statusReason: 'Массовая рассылка спама в комментариях к плейлистам.', statusChangedAt: '2026-10-15T10:00:00.000Z' }),
  user('u-9', 'Нургуль Темирова', 'nurgul@example.kg', 'Каракол', 'listener', '2026-08-28T08:00:00.000Z', '2026-10-19T19:40:00.000Z'),
  user('u-10', 'Медер Жээнбеков', 'meder@example.kg', 'Бишкек', 'listener', '2026-09-14T16:20:00.000Z', '2026-10-21T07:05:00.000Z'),
  user('u-11', 'Эмиль Касымов', 'emil@example.kg', 'Бишкек', 'artist', '2026-10-01T10:00:00.000Z', '2026-10-20T18:15:00.000Z', { artistId: 'dart-1' }),
  user('u-12', 'Данияр Омуров', 'daniyar.o@example.kg', 'Бишкек', 'artist', '2026-10-05T12:00:00.000Z', '2026-10-21T06:35:00.000Z', { artistId: 'dart-4' }),
  user('u-13', 'Алия Сулайманова', 'aliya@example.kg', 'Бишкек', 'artist', '2026-10-08T09:30:00.000Z', '2026-10-20T08:20:00.000Z', { artistId: 'dart-5' }),
];

/** Audit events matching every decision already present in the seed (oldest first). */
function seedActivity(): ActivityEvent[] {
  const events: Omit<ActivityEvent, 'id' | 'mock'>[] = [];
  for (const a of ARTISTS.filter((x) => x.status !== 'pending')) {
    const decision = a.status === 'approved' ? 'approve' : a.status === 'rejected' ? 'reject' : 'request-changes';
    events.push({ at: a.decidedAt!, actorId: a.decidedBy!, actorRoleId: 'arm-super-admin', action: `artist.${decision}`, entity: { type: 'artist', id: a.id, label: a.name }, fromStatus: 'pending', toStatus: a.status, ...(a.reason ? { reason: a.reason } : {}) });
  }
  for (const s of SUBMISSIONS.filter((x) => x.status !== 'pending')) {
    const decision = s.status === 'approved' ? 'approve' : s.status === 'rejected' ? 'reject' : 'request-changes';
    events.push({ at: s.decidedAt!, actorId: s.decidedBy!, actorRoleId: 'arm-moderator', action: `${s.kind}.${decision}`, entity: { type: s.kind, id: s.id, label: s.title }, fromStatus: 'pending', toStatus: s.status, ...(s.reason ? { reason: s.reason } : {}) });
  }
  const suspended = USERS.find((u) => u.status === 'suspended')!;
  events.push({ at: suspended.statusChangedAt!, actorId: 'staff-arm-3', actorRoleId: 'arm-support', action: 'user.suspend', entity: { type: 'user', id: suspended.id, label: suspended.name }, fromStatus: 'active', toStatus: 'suspended', reason: suspended.statusReason });
  return events.sort((a, b) => a.at.localeCompare(b.at)).map((e, i) => ({ ...e, id: `seed-event-${i + 1}`, mock: true }));
}

export function armSeed(): ArmCollections {
  return structuredClone({ submissions: SUBMISSIONS, artists: ARTISTS, users: USERS, activity: seedActivity() });
}

/** Upload genre options of the Mmusic app (same list as Artist Setup / Upload Track) plus the catalog's Kyrgyz styles. */
export const GENRES = ['Electronic', 'Ambient', 'Synthwave', 'Indie', 'Dream Pop', 'Neo-Classical', 'Hip-Hop', 'Pop', 'Rock', 'Jazz', 'Lo-Fi', 'Kyrgyz Pop', 'Kyrgyz Rap', 'Kyrgyz Folk'];
