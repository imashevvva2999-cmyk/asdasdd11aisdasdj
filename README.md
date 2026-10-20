# Mmusic

Мобильное приложение для стриминга музыки в цифровой экосистеме банка (в дизайне — MBANK, подтверждение: OQ-01).
Отличительная функция — прямая поддержка артистов донатами со счёта банка.

> **Статус: разработка начата (2026-10-06).** Документация утверждена и используется как источник истины. Идёт Фаза 1 (`docs/development-plan.md`) — монорепозиторий, базовый мобильный клиент и API.

## Документация

| Документ | Содержание |
|---|---|
| [docs/technical-specification.md](docs/technical-specification.md) | Техническое задание: обзор, цели, функциональные требования, интеграция с банком, технические требования, критерии приёмки |
| [docs/screens.md](docs/screens.md) | 24 экрана из дизайна, навигация, состояния, дизайн-система и компоненты |
| [docs/user-flow.md](docs/user-flow.md) | Пользовательские сценарии UF-01…UF-13 |
| [docs/architecture.md](docs/architecture.md) | Архитектура, стек, API, потоки данных, модели данных, структура проекта |
| [docs/development-plan.md](docs/development-plan.md) | Фазы 0–11, зависимости, риски |
| [docs/tasks.md](docs/tasks.md) | Задачи по фазам с критериями готовности |
| [docs/open-questions.md](docs/open-questions.md) | 47 открытых вопросов, 16 из них блокирующие |

Метки в документах: **[Д]** — подтверждено дизайном, **[П]** — предложение, **[Т]** — технически необходимо, **[Доп]** — допущение, **OQ-NN** — открытый вопрос.

## Дизайн

Источник истины по UI/UX — папка [`stitch_mmusic_mobile_streaming_app/`](stitch_mmusic_mobile_streaming_app/):
- `*/screen.png` и `*/code.html` — макеты экранов (экспорт Google Stitch);
- `nocturne_audio/DESIGN.md` — дизайн-система «Nocturne Audio» (цвета, типографика, отступы, компоненты).

Папка с дизайном не изменяется.

## Предлагаемый стек (на согласовании, OQ-46)

- **Mobile:** React Native + Expo (TypeScript), Expo Router, react-native-track-player, TanStack Query, Zustand
- **Backend:** Node.js + NestJS, PostgreSQL, Redis, OpenSearch / Meilisearch, S3 + CDN (HLS)
- **Банк:** OIDC SSO, Payments API, биометрическое подтверждение — по API MBANK (OQ-07, OQ-44)

## Структура репозитория (сейчас)

```
apps/mobile/                           # Expo + TypeScript + Expo Router (React Native)
apps/api/                              # NestJS backend, /health живой
ui-kit/tokens/                         # @mmusic/ui-kit/tokens — токены Nocturne Audio из DESIGN.md, источник истины для стилей
docs/                                  # ТЗ и проектная документация
stitch_mmusic_mobile_streaming_app/    # исходный дизайн (не изменяется)
docker-compose.yml                     # Postgres + Redis для локальной разработки
.env.example                           # шаблон переменных окружения (без секретов)
CLAUDE.md                              # инструкции для AI-агентов (Claude Code + Ruflo)
```
Монорепо на pnpm workspaces + Turborepo. Корневой `package.json` также содержит `@receptron/laya` (роль — OQ-41, не подключён ни к одной подсистеме). Целевая структура — `docs/architecture.md` §7.

```bash
pnpm install        # установить все пакеты монорепо
pnpm dev             # запустить mobile + api в dev-режиме (turbo)
pnpm typecheck       # tsc --noEmit во всех пакетах
pnpm lint            # линт во всех пакетах
pnpm test            # тесты во всех пакетах
docker compose up -d # поднять Postgres + Redis
```

## Планирование

Задачи и память проекта ведутся в Ruflo (claude-flow):
```bash
npx ruflo@latest task list
npx ruflo@latest memory search --query "mmusic" --namespace mmusic
```
