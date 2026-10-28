# Mmusic

Сервис стриминга музыки в цифровой экосистеме банка (в дизайне — MBANK, подтверждение: OQ-01).
Отличительная функция — прямая поддержка артистов донатами со счёта банка.

> **Статус (2026-10-28): рабочий фронтенд-прототип.** Сайт, мобильное приложение (iOS и Android), АРМ и CRM работают на демо-данных. Бэкенда, авторизации и реальных платежей MBANK пока нет.
>
> **Новому разработчику — начать с [HANDOVER.md](HANDOVER.md):** актуальная ветка (`fix/android-sdk58`), запуск каждого приложения, статус Android, известные ошибки и доступы к Expo/EAS и Vercel.

## Приложения

| Папка | Что это | Стек | Запуск (из корня) |
|---|---|---|---|
| `apps/web` | Сайт Mmusic | React 19 + Vite + React Router | `pnpm --filter @mmusic/web dev` → http://127.0.0.1:5180 |
| `apps/mobile` | Приложение для iOS и Android | Expo SDK 58, React Native 0.88, Expo Router | `cd apps/mobile && ./node_modules/.bin/expo start --go` → Expo Go |
| `apps/arm` | АРМ — рабочее место оператора/модератора | React 19 + Vite | `pnpm --filter @mmusic/arm dev` → http://127.0.0.1:5182 |
| `apps/crm` | CRM — артисты, группы, организации | React 19 + Vite | `pnpm --filter @mmusic/crm dev` → http://127.0.0.1:5184 |
| `apps/api` | Бэкенд (только заготовка, `/health`) | NestJS | `pnpm --filter @mmusic/api start:dev` |

АРМ и CRM — локальные прототипы без авторизации: не размещать в открытом доступе.

## Быстрый старт

Требуются Node.js 24 и pnpm 12.9.1 (`packageManager` в `package.json`).

```bash
git checkout fix/android-sdk58   # актуальная ветка; main устарел
pnpm install                     # все пакеты монорепозитория
pnpm typecheck                   # tsc --noEmit во всех пакетах
pnpm lint                        # линт во всех пакетах
pnpm test                        # тесты во всех пакетах
docker compose up -d             # Postgres + Redis для будущего бэкенда
```

Проверки отдельного приложения: `pnpm --filter @mmusic/<web|arm|crm|api|mobile> <typecheck|lint|test|build>`. Известные ошибки проверок мобильного приложения перечислены в [HANDOVER.md](HANDOVER.md#6-известные-ограничения-и-ошибки-проверок).

Переменные окружения (только имена, без значений) — в `.env.example` и [HANDOVER.md](HANDOVER.md#8-переменные-окружения-только-имена).

## Структура репозитория

```
apps/web/                              # сайт (React + Vite)
apps/mobile/                           # iOS + Android (Expo SDK 58 + Expo Router)
apps/arm/                              # АРМ (React + Vite)
apps/crm/                              # CRM (React + Vite)
apps/api/                              # NestJS-заготовка бэкенда
core/                                  # общая логика сайта и мобильного: состояние, аудио, демо-каталог, i18n, хранилище
ui-kit/                                # дизайн-система Nocturne Audio: токены, WebGL-визуалы, веб-компоненты, иконки
packages/backoffice/                   # общий код АРМ и CRM
docs/                                  # ТЗ, архитектура, диаграммы, планы
stitch_mmusic_mobile_streaming_app/    # исходный дизайн (не изменяется)
docker-compose.yml                     # Postgres + Redis для локальной разработки
.env.example                           # шаблон переменных окружения (без секретов)
HANDOVER.md                            # передача проекта: ветки, запуск, статус, доступы
CLAUDE.md                              # инструкции для AI-агентов (частично устарели — см. HANDOVER.md)
```

Монорепозиторий на pnpm workspaces + Turborepo. Корневой `package.json` также содержит `@receptron/laya` (роль — OQ-41, не подключён ни к одной подсистеме).

## Документация

| Документ | Содержание |
|---|---|
| [HANDOVER.md](HANDOVER.md) | Текущее состояние проекта, запуск, Android, ограничения, доступы |
| [docs/technical-specification.md](docs/technical-specification.md) | Техническое задание: обзор, цели, функциональные требования, интеграция с банком, критерии приёмки |
| [docs/screens.md](docs/screens.md) | Экраны из дизайна, навигация, состояния, дизайн-система и компоненты |
| [docs/user-flow.md](docs/user-flow.md) | Пользовательские сценарии UF-01…UF-13 |
| [docs/architecture.md](docs/architecture.md) | Целевая архитектура, стек, API, потоки данных, модели данных |
| [docs/architecture-diagrams/](docs/architecture-diagrams/README.md) | Диаграммы фактического состояния кода (снимок 2026-10-22) |
| [docs/arm-crm-plan.md](docs/arm-crm-plan.md) | План, решения и открытые вопросы по АРМ и CRM |
| [docs/mbank-payment-integration.md](docs/mbank-payment-integration.md) | Интеграция платежей MBANK |
| [docs/demo-artist-account.md](docs/demo-artist-account.md) | Демо-аккаунт артиста |
| [docs/development-plan.md](docs/development-plan.md), [docs/tasks.md](docs/tasks.md) | Фазы и задачи |
| [docs/open-questions.md](docs/open-questions.md) | Открытые продуктовые вопросы |

Метки в документах: **[Д]** — подтверждено дизайном, **[П]** — предложение, **[Т]** — технически необходимо, **[Доп]** — допущение, **OQ-NN** — открытый вопрос.

## Дизайн

Источник истины по UI/UX — папка [`stitch_mmusic_mobile_streaming_app/`](stitch_mmusic_mobile_streaming_app/):
- `*/screen.png` и `*/code.html` — макеты экранов (экспорт Google Stitch);
- `nocturne_audio/DESIGN.md` — дизайн-система «Nocturne Audio» (цвета, типографика, отступы, компоненты).

Папка с дизайном не изменяется.
