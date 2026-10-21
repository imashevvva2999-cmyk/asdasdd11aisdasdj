import type { Campaign, DemoTransaction } from './types.ts';

/**
 * Fictional M3 demo data (campaign requests and fan donations). Only fictional demo artists (dart-*) and demo users
 * (u-*) take part — never catalog artists. Budgets and donation amounts are invented, labelled "демо" in the UI and
 * describe no real money. No campaign has run, so there are no reach, stream or audience figures.
 */

const campaign = (id: string, artistId: string, submissionId: string, toolId: Campaign['toolId'], requestedBudgetKgs: number | undefined, durationDays: number, startsAt: string, regions: string[], submittedAt: string, pitch: Campaign['pitch'], rest: Partial<Campaign> = {}): Campaign => ({
  id, mock: true, artistId, submissionId, toolId, ...(requestedBudgetKgs === undefined ? {} : { requestedBudgetKgs }), durationDays, startsAt, regions, submittedAt, pitch, status: 'pending', ...rest,
});

export const CAMPAIGNS: Campaign[] = [
  campaign('camp-1', 'dart-3', 'sub-t4', 'recommendation-boost', 3000, 10, '2026-10-28T00:00:00.000Z', ['Бишкек', 'Ош'], '2026-10-20T15:20:00.000Z', {
    ru: 'Хотим больше слушателей в «Для вас» перед концертом в Оше.',
    en: 'We want more listeners in For You before our concert in Osh.',
  }),
  campaign('camp-2', 'dart-3', 'sub-r3', 'editorial-pitch', undefined, 14, '2026-11-01T00:00:00.000Z', ['Кыргызстан'], '2026-10-21T04:10:00.000Z', {
    ru: 'Просим рассмотреть сингл для подборки «Топ Кыргызстан».',
    en: 'Please consider the single for the "Top Kyrgyzstan" playlist.',
  }),
  campaign('camp-3', 'dart-1', 'sub-t1', 'recommendation-boost', 1500, 7, '2026-10-30T00:00:00.000Z', ['Бишкек'], '2026-10-20T18:30:00.000Z', {
    ru: 'Буст для дебютного сингла сразу после публикации.',
    en: 'A boost for the debut single right after it is published.',
  }),
  campaign('camp-4', 'dart-4', 'sub-t5', 'recommendation-boost', 1800, 7, '2026-11-03T00:00:00.000Z', ['Бишкек', 'Каракол'], '2026-10-21T06:40:00.000Z', {
    ru: 'Продвижение нового трека в рекомендациях.',
    en: 'Promotion of the new track in recommendations.',
  }),
  campaign('camp-5', 'dart-5', 'sub-t6', 'home-banner', 9000, 5, '2026-11-10T00:00:00.000Z', ['Кыргызстан'], '2026-10-18T20:00:00.000Z', { ru: 'Баннер на Главной к выходу трека.', en: 'A Home banner for the track release.' }, {
    status: 'changes-requested',
    decidedAt: '2026-10-19T09:15:00.000Z',
    decidedBy: 'staff-arm-1',
    reason: 'Для баннера нужна обложка в высоком разрешении без текста поверх изображения.',
  }),
  campaign('camp-6', 'dart-1', 'sub-t7', 'recommendation-boost', 2000, 10, '2026-10-20T00:00:00.000Z', ['Бишкек'], '2026-10-15T10:00:00.000Z', { ru: 'Буст для трека «Сигнал».', en: 'A boost for the track "Сигнал".' }, {
    status: 'rejected',
    decidedAt: '2026-10-16T12:30:00.000Z',
    decidedBy: 'staff-arm-1',
    reason: 'Продвигаемый трек отклонён модерацией — кампания невозможна.',
  }),
  campaign('camp-7', 'dart-3', 'sub-t4', 'editorial-pitch', undefined, 14, '2026-10-18T00:00:00.000Z', ['Ош'], '2026-10-15T09:00:00.000Z', { ru: 'Питчинг в региональную подборку юга.', en: 'Pitch to the southern regional playlist.' }, {
    status: 'approved',
    decidedAt: '2026-10-16T08:45:00.000Z',
    decidedBy: 'staff-arm-1',
  }),
];

const tx = (n: number, amountKgs: number, status: DemoTransaction['status'], createdAt: string, payerUserId: string, recipientArtistId: string, accountMask: string, failureReason?: DemoTransaction['failureReason']): DemoTransaction => ({
  id: `tx-${n}`, mock: true, reference: `DEMO-TX-${1000 + n}`, kind: 'donation', amountKgs, status, createdAt, payerUserId, recipientArtistId, accountMask, ...(failureReason ? { failureReason } : {}),
});

const INSUFFICIENT = { ru: 'Недостаточно средств на счёте (демо)', en: 'Insufficient funds (demo)' };
const BANK_DECLINED = { ru: 'Операция отклонена банком (демо)', en: 'Declined by the bank (demo)' };

/** Donation amounts follow the app's quick choices (10 / 50 / 100 / 500 сом) plus a few custom ones. */
export const TRANSACTIONS: DemoTransaction[] = [
  tx(1, 100, 'completed', '2026-10-14T18:20:00.000Z', 'u-6', 'dart-3', '•••• 0041'),
  tx(2, 50, 'completed', '2026-10-15T09:05:00.000Z', 'u-7', 'dart-3', '•••• 0052'),
  tx(3, 500, 'completed', '2026-10-16T20:40:00.000Z', 'u-9', 'dart-1', '•••• 0063'),
  tx(4, 10, 'completed', '2026-10-17T07:15:00.000Z', 'u-10', 'dart-5', '•••• 0074'),
  tx(5, 250, 'completed', '2026-10-17T21:30:00.000Z', 'u-6', 'dart-1', '•••• 0041'),
  tx(6, 100, 'failed', '2026-10-18T12:10:00.000Z', 'u-7', 'dart-5', '•••• 0052', INSUFFICIENT),
  tx(7, 50, 'completed', '2026-10-18T12:14:00.000Z', 'u-7', 'dart-5', '•••• 0052'),
  tx(8, 500, 'failed', '2026-10-19T16:00:00.000Z', 'u-10', 'dart-3', '•••• 0074', BANK_DECLINED),
  tx(9, 100, 'completed', '2026-10-19T19:45:00.000Z', 'u-9', 'dart-3', '•••• 0063'),
  tx(10, 1000, 'completed', '2026-10-20T10:30:00.000Z', 'u-6', 'dart-3', '•••• 0041'),
  tx(11, 50, 'pending', '2026-10-21T07:55:00.000Z', 'u-10', 'dart-1', '•••• 0074'),
  tx(12, 100, 'pending', '2026-10-21T08:05:00.000Z', 'u-9', 'dart-5', '•••• 0063'),
];
