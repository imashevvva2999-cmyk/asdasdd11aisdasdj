# Mmusic — передача проекта

Дата: 2026-10-28. Документ для следующего разработчика: где лежит актуальный код, как его запустить, что проверено и что осталось открытым.

## 1. Коротко

- **Рабочая ветка — `fix/android-sdk58`.** В ней всё актуальное: сайт, мобильное приложение (iOS и Android, Expo SDK 58), АРМ, CRM, общий код. Начинать работу с неё.
- **`main` на GitHub устарел** (`f40b8f1`, до появления сайта, АРМ и CRM). Слияние `fix/android-sdk58` → `main` ещё не выполнялось — это решение владельца проекта.
- **Бэкенда нет.** Все приложения работают на демо-данных и локальном хранилище; платежи MBANK смоделированы.
- Репозиторий: <https://github.com/imashevvva2999-cmyk/asdasdd11aisdasdj> (приватный).

## 2. Ветки, теги и коммиты

| Ссылка | Коммит | Что это |
|---|---|---|
| `fix/android-sdk58` | вершина ветки | Актуальная версия всего проекта + этот документ |
| `fix/android-sdk58` | `1f76775` | Android: непрозрачная панель шторки артиста (проверено на эмуляторе) |
| `fix/android-sdk58` | `b239fcb` | Android: конфигурация сборки SDK 58 (`eas.json`, `versionCode` 2) |
| `experiment/sdk58-expo-go` | `beed6ee` | Утверждённая версия для iPhone (проверена на физическом iPhone) |
| тег `checkpoint/mmusic-ios-approved-sdk58` | `beed6ee` | Неизменяемая точка утверждённой iPhone-версии — не переписывать |
| `main` | `f40b8f1` | Устаревшее состояние (2026-10-12) |

`experiment/sdk58-expo-go` целиком входит в `fix/android-sdk58`. Работа по АРМ/CRM (ветка `w2-shared-foundations`, `c6f5296`, 2026-10-21) тоже входит в `fix/android-sdk58`.

## 3. Структура проекта

Монорепозиторий pnpm workspaces + Turborepo.

| Папка | Приложение | Стек | Состояние |
|---|---|---|---|
| `apps/web` | Сайт Mmusic | React 19, Vite 8, React Router 7, TypeScript | Полный сайт: главная, поиск, медиатека, плеер, кабинет артиста, продвижение, демо-режим |
| `apps/mobile` | iOS + Android | Expo SDK 58, React Native 0.88, React 19.3, Expo Router 58 | iPhone утверждён; Android проверен на эмуляторе (раздел 5) |
| `apps/arm` | АРМ — рабочее место оператора/модератора | React 19, Vite 8 | Фронтенд-прототип M1–M6, без авторизации |
| `apps/crm` | CRM — артисты, группы, организации | React 19, Vite 8 | Фронтенд-прототип M1–M6, без авторизации |
| `apps/api` | Бэкенд | NestJS | Только заготовка (`/health`), ни одно приложение его не вызывает |
| `core/` | Общая логика сайта и мобильного приложения | TypeScript, Zustand | Состояние (плеер, медиатека, кабинет), аудио-движок, демо-каталог, i18n, хранилище |
| `ui-kit/` | Дизайн-система Nocturne Audio | — | Токены, WebGL-визуалы (Particle Wave, Living Moods), веб-компоненты и иконки |
| `packages/backoffice` | Общий код АРМ и CRM | TypeScript | Хранилище, роли, демо-данные |
| `stitch_mmusic_mobile_streaming_app/` | Исходный дизайн (Google Stitch) | — | Источник истины по UI, не изменять |
| `docs/` | Документация | — | ТЗ, экраны, сценарии, архитектура, план АРМ/CRM, интеграция MBANK |

Архитектурные диаграммы (снимок на 2026-10-22): [`docs/architecture-diagrams/`](docs/architecture-diagrams/README.md), просмотр — `docs/architecture-diagrams/viewer.html` в браузере.

## 4. Установка и запуск

### Требования

- Node.js 24 (проект проверялся на v24.20.0; версия в репозитории не закреплена).
- pnpm 12.9.1 — версия указана в `packageManager` корневого `package.json`. Включается через `corepack enable` или `npm i -g pnpm@12.9.1`.
- Для телефона: приложение **Expo Go для SDK 58** на iPhone/Android и аккаунт Expo.
- Для эмулятора Android: Android SDK (platform-tools, emulator, системный образ API 35).

### Установка

```bash
git clone https://github.com/imashevvva2999-cmyk/asdasdd11aisdasdj.git mmusic
cd mmusic
git checkout fix/android-sdk58
pnpm install
```

### Запуск

| Приложение | Команда (из корня) | Адрес |
|---|---|---|
| Сайт | `pnpm --filter @mmusic/web dev` | http://127.0.0.1:5180 |
| АРМ | `pnpm --filter @mmusic/arm dev` | http://127.0.0.1:5182 |
| CRM | `pnpm --filter @mmusic/crm dev` | http://127.0.0.1:5184 |
| API (заготовка) | `pnpm --filter @mmusic/api start:dev` | `/health` |
| Мобильное приложение | `cd apps/mobile && ./node_modules/.bin/expo start --go` | QR-код для Expo Go |

Порты закреплены (`strictPort`): сервер не «переедет» на чужой порт. Preview-сборки: сайт 5181, АРМ 5183, CRM 5185.

Мобильное приложение:
- Запускать **локальный** CLI (`./node_modules/.bin/expo`), а не глобальный — так версия совпадает с SDK 58.
- Телефон в той же сети: `expo start --go`. Через туннель: `--tunnel` (у Expo бывают ограничения по частоте — ошибка 429, тогда перезапустить).
- Эмулятор Android: `expo start --go --localhost --android`.
- Демо-вход артиста (только для разработки): `pnpm --filter @mmusic/mobile demo:setup` записывает логин и SHA-256 пароля в `apps/mobile/.env.local` (файл в `.gitignore`).

Postgres и Redis для будущего бэкенда: `docker compose up -d`.

### Проверки

| Приложение | Команды | Результат на 2026-10-28 |
|---|---|---|
| Сайт | `typecheck`, `lint`, `build`, `verify:no-native` | ✅ всё проходит |
| АРМ | `typecheck`, `lint`, `test`, `build` | ✅ всё проходит |
| CRM | `typecheck`, `lint`, `test`, `build` | ✅ всё проходит |
| API | `typecheck`, `lint`, `test`, `build` | ✅ всё проходит |
| Мобильное | `pnpm --filter @mmusic/mobile test` (41 проверочный скрипт) | ⚠️ 40 из 41 проходят, `verify-routes` — известные ошибки (раздел 6) |
| Мобильное | `typecheck` | ⚠️ 15 известных ошибок TypeScript (раздел 6) |

Пример: `pnpm --filter @mmusic/arm test`. `test` мобильного приложения останавливается на первом упавшем скрипте (`verify-routes`), поэтому остальные проверки удобнее запускать по отдельности: `pnpm --filter @mmusic/mobile verify:native-persistence` и т. д. (список — в `apps/mobile/package.json`).

## 5. Android — текущий статус

Проверено 2026-10-27 на эмуляторе (Pixel 7, Android 15, arm64) в Expo Go 58.0.5. Физического Android-устройства не было.

| Функция | Результат |
|---|---|
| Запуск | ✅ без сбоев и ошибок |
| Particle Wave B | ✅ отрисовывается |
| Living Moods | ✅ все 4 сцены |
| Воспроизведение | ✅ первый трек ≈3 с (разовый прогрев аудио), следующий предзагруженный — 0,18 с, повтор из кэша — 0,24 с |
| Навигация, плеер, шторка артиста | ✅ (после исправления `1f76775`) |
| Кабинет артиста и продвижение | ✅ «Мой кабинет» и Demo Artist |
| Сохранение данных (SQLite) | ✅ переживает принудительное закрытие приложения |

**Причина сбоя старого APK (SDK 57, сборка EAS `c9bbbe86`, `versionCode` 1):** в корневом layout обращение к `window.location.pathname`, которого нет в релизной сборке Android. Исправлено в SDK 58 (`1fef3e2`); других небезопасных обращений к браузерным API в мобильном коде не найдено.

**Новый APK SDK 58 ещё не собран.** Готово к сборке: `cd apps/mobile && eas build --platform android --profile preview` (внутренний APK, `versionCode` 2 — ставится поверх старого). Нужен доступ к проекту EAS (раздел 7).

Открытые вопросы Android:
- Эмулятор ≠ реальный Xiaomi/MIUI: ограничения фоновой работы, энергосбережение и производительность на реальном телефоне не проверены.
- Волна не реагирует на музыку: для анализа звука на Android нужно разрешение `RECORD_AUDIO`, оно не запрашивается (на iPhone реагирует).
- `expo-blur` на Android не размывает фон — поэтому стеклянные шторки там почти непрозрачные (`bottom-sheet.tsx`).
- Предупреждение Expo Router: маршрут `now-playing-artist` открывается как карточка, а не прозрачный модал (выглядит корректно).
- Для локальной нативной сборки (без EAS) не установлен `platforms;android-35`.

## 6. Известные ограничения и ошибки проверок

Проект — фронтенд-прототип:
- **Нет бэкенда и общей базы данных.** Данные каждого приложения — демо-каталог и локальное хранилище (сайт, АРМ, CRM — `localStorage`; телефон — SQLite). Приложения не обмениваются данными.
- **Нет авторизации.** Роли в АРМ/CRM — переключатель для разработки («Prototype only — not authentication or security»). АРМ и CRM не размещать в открытом доступе.
- **Платежи MBANK смоделированы.** Реальная интеграция описана в `docs/mbank-payment-integration.md`.
- **Нет CI/CD** (`.github/workflows` отсутствует), все деплои ручные.
- **iOS — только через Expo Go.** Для отдельной iOS-сборки нужны `ios.bundleIdentifier` в `app.json` и Apple Developer аккаунт.
- **Анимация закрытия плеера:** в Expo Router 58 убрано событие `beforeRemove`, на котором держалась анимация, — нужна переделка через `usePreventRemove`.

Известные ошибки проверок мобильного приложения (они же были в утверждённой iPhone-версии `beed6ee`, новыми не являются):
- **TypeScript — 15 ошибок** в `src/app/player/lyrics.tsx` (2), `src/components/home/home-stage.tsx` (6), `src/components/mini-player.tsx` (1), `src/components/player/use-player-sheet.ts` (4), `src/components/ui/icon.tsx` (2). Запуск в Expo от них не ломается.
- **`verify-routes` — 60 строк ошибок** в проверке статического веб-экспорта мобильного приложения (например, страницы жанров `/search/genre/[id]` не отрисовываются заранее). Это касается только веб-экспорта `apps/mobile`, не сайта `apps/web`.

Документация, которая отстаёт от кода:
- `CLAUDE.md` всё ещё говорит «код не писать» — это инструкция этапа документации, она устарела.
- `apps/web/README.md`, `apps/arm/README.md`, `apps/crm/README.md` описывают ранние этапы (W1/M1).
- В репозитории закоммичены служебные файлы AI-инструментов (`.claude-flow/`, `.swarm/`, `ruvector.db`, `.DS_Store`) — безвредны, но их можно убрать и добавить в `.gitignore`.

## 7. Доступы: Expo/EAS, Vercel, GitHub

Сейчас всё зарегистрировано на личные аккаунты стажёра — до продолжения работы нужно передать доступ:

| Сервис | Что есть | Что нужно сделать |
|---|---|---|
| GitHub | Приватный репозиторий в личном аккаунте | Добавить нового разработчика как collaborator или передать репозиторий организации |
| Expo / EAS | Проект `mmusic`, владелец `kalema29` (`owner` и `extra.eas.projectId` в `apps/mobile/app.json`); профили сборки в `apps/mobile/eas.json` | Пригласить в проект или перенести его в аккаунт/организацию компании. Без этого `eas build` не запустится |
| Vercel | Проект «mobile» — веб-экспорт `apps/mobile` (`apps/mobile/vercel.json`); привязка в локальном `.vercel/project.json` (не в git) | Пригласить в команду Vercel или передать проект. Для `apps/web`, `apps/arm`, `apps/crm` конфигурации деплоя в репозитории нет — ранее они разворачивались вручную |

## 8. Переменные окружения (только имена)

Значения не хранятся в git. Шаблон — корневой `.env.example`.

| Переменная | Где | Назначение |
|---|---|---|
| `PORT`, `NODE_ENV` | API | Порт и режим |
| `DATABASE_URL`, `REDIS_URL` | API | Postgres и Redis (`docker-compose.yml`) |
| `MBANK_MOCK_MODE` | API | Режим эмуляции MBANK |
| `MBANK_IDP_ISSUER_URL`, `MBANK_IDP_CLIENT_ID`, `MBANK_IDP_CLIENT_SECRET` | API | Вход через MBANK (OIDC) — пока не используется |
| `MBANK_PAYMENTS_BASE_URL`, `MBANK_PAYMENTS_API_KEY` | API | Платежи MBANK — пока не используется |
| `CDN_BASE_URL` | API | CDN для аудио — пока не используется |
| `EXPO_PUBLIC_PAYMENTS_API_URL`, `EXPO_PUBLIC_MBANK_PAYMENT_MODE` | Мобильное | Адрес и режим платёжного API |
| `EXPO_PUBLIC_DEMO_ARTIST_LOGIN`, `EXPO_PUBLIC_DEMO_ARTIST_PASSWORD_SHA256` | Мобильное, только разработка | Демо-вход артиста (`demo:setup`, файл `.env.local`) |
| `DEMO_ENV_FILE` | Скрипт `demo:setup` | Путь к файлу, куда записать демо-вход |

`EXPO_PUBLIC_*` встраиваются в сборку приложения и видны пользователю — секреты туда не класть.

## 9. Документация

| Документ | Содержание |
|---|---|
| [docs/technical-specification.md](docs/technical-specification.md) | Техническое задание |
| [docs/screens.md](docs/screens.md) | Экраны, навигация, состояния |
| [docs/user-flow.md](docs/user-flow.md) | Пользовательские сценарии |
| [docs/architecture.md](docs/architecture.md) | Целевая архитектура, API, модели данных |
| [docs/architecture-diagrams/](docs/architecture-diagrams/README.md) | Диаграммы фактического состояния (2026-10-22) |
| [docs/arm-crm-plan.md](docs/arm-crm-plan.md) | План, решения и вопросы по АРМ и CRM |
| [docs/mbank-payment-integration.md](docs/mbank-payment-integration.md) | Интеграция платежей MBANK |
| [docs/demo-artist-account.md](docs/demo-artist-account.md) | Демо-аккаунт артиста |
| [docs/open-questions.md](docs/open-questions.md) | Открытые продуктовые вопросы |
| [docs/development-plan.md](docs/development-plan.md), [docs/tasks.md](docs/tasks.md), [docs/mmusic-task-tracker.md](docs/mmusic-task-tracker.md) | План и задачи |
| [stitch_mmusic_mobile_streaming_app/nocturne_audio/DESIGN.md](stitch_mmusic_mobile_streaming_app/nocturne_audio/DESIGN.md) | Дизайн-система |

## 10. Что осталось только на компьютере стажёра

Не загружено в репозиторий (не обязательно для продолжения работы):
- `docs/design-review/` — 63 скриншота для сверки дизайна (23 МБ).
- `scripts/laya-demo/` — демо-скрипт `@receptron/laya` (OQ-41).
- Ветка `restructure/app-ui-kit` (2 коммита, альтернативная перестройка папок `apps/` → `app/`; в рабочую ветку не вошла) и старые экспериментальные ветки.
- Около 40 локальных тегов-чекпоинтов (их коммиты уже есть на GitHub, сами имена тегов — нет).

## 11. Рекомендуемые следующие шаги

1. Передать доступы (раздел 7).
2. Решить, сливать ли `fix/android-sdk58` в `main`.
3. Собрать APK SDK 58 и проверить на реальном Android-телефоне.
4. Исправить 15 ошибок TypeScript и `verify-routes`.
5. Обновить `CLAUDE.md` и README приложений; убрать служебные файлы AI-инструментов из git.
6. Спроектировать бэкенд, авторизацию и реальную интеграцию MBANK по `docs/architecture.md`.
