# Диаграмма 5 — целевая архитектура (TO-BE)

Статус: **ЦЕЛЕВОЕ / ПЛАНИРУЕМОЕ — ничего из этого не реализовано.** Основано на уже утверждённых разделах технического задания: `docs/architecture.md` §1 («Общая архитектура»), §3 («Backend»), §5 («Поток данных»), §6 («Модели данных»); `docs/technical-specification.md` §3.19 («Admin Panel»). Это не предложение этого анализа — это существующий, ранее одобренный лидом продукта план, реализация которого отложена до отдельного одобрения backend-вехи (Фазы 8-9 в `docs/development-plan.md`).

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
  classDef mobile fill:#1e3a5f,stroke:#4d9fff,color:#e8f0ff
  classDef web fill:#1f3d2e,stroke:#4ade80,color:#e8fff0
  classDef arm fill:#4a2e12,stroke:#fb923c,color:#fff4e8
  classDef crm fill:#3a1f4d,stroke:#c084fc,color:#f5e8ff
  classDef future stroke-dasharray: 6 4,stroke:#f59e0b,color:#ffe8c8,fill:#2a1f10
  classDef bank stroke-dasharray: 6 4,stroke:#f472b6,color:#ffe0ef,fill:#2a1420

  subgraph Clients["Клиенты (сегодня - frontend-only, мок-данные)"]
    direction LR
    MOBILE3["Mmusic Mobile"]:::mobile
    WEBSITE3["Mmusic Website"]:::web
    ARM3["ARM"]:::arm
    CRM3["CRM"]:::crm
  end

  GW["API Gateway<br/>TLS, rate limit, WAF"]:::future

  subgraph BackendSvc["Mmusic Backend - модульный монолит (apps/api, NestJS)"]
    direction LR
    AUTH3["auth"]:::future
    CATALOG3["catalog"]:::future
    DON3["donations"]:::future
    ADMIN3["admin<br/>(Admin Panel, FR-19.1,<br/>роли не определены - OQ-54)"]:::future
    AN3["analytics"]:::future
  end

  subgraph DataLayer["Данные"]
    direction LR
    PG["PostgreSQL"]:::future
    RD["Redis"]:::future
    SE["OpenSearch / Meilisearch"]:::future
    S3["S3 + CDN"]:::future
  end

  subgraph Bank["MBANK"]
    direction LR
    IDP["IdP / SSO"]:::bank
    PAY3["Payments API"]:::bank
    BIO["Биометрия"]:::bank
  end

  MOBILE3 --> GW
  WEBSITE3 --> GW
  ARM3 -.->|"ARM = рабочий прототип admin,<br/>формально не подключён к ТЗ"| GW
  CRM3 -.->|"модель CRM не описана в ТЗ"| GW

  GW --> AUTH3 & CATALOG3 & DON3 & ADMIN3 & AN3

  CATALOG3 --> PG
  DON3 --> PG
  AUTH3 --> RD
  CATALOG3 --> SE
  CATALOG3 --> S3

  AUTH3 --> IDP
  DON3 --> PAY3 --> BIO
  AN3 -.->|"выгрузка событий"| IDP
```

## Как это читать

- **Клиенты** — те же 4 приложения, что и сегодня, но обращаются к единому **API Gateway** вместо локальных мок-данных.
- **Backend** — модульный монолит на NestJS (задел `apps/api` уже существует, но пуст): модули `auth`, `catalog`, `donations`, `admin`, `analytics` и другие (`users`, `search`, `library`, `playlists`, `playback`, `recommendations` — см. `docs/architecture.md` §3.2).
- **Данные**: собственная БД Mmusic на PostgreSQL (каталог — не обёртка над внешним сервисом, подтверждено 2026-10-06), Redis для кеша/сессий, поиск через OpenSearch/Meilisearch, аудио и обложки через S3+CDN.
- **MBANK** — банк предоставляет IdP/SSO для входа, Payments API + биометрию для донатов; Mmusic никогда не хранит платёжные данные сам.
- **Пунктирные розовые связи с MBANK** и **пунктирные жёлтые узлы backend/данных** — всё это **не реализовано**, это цель, не факт.
- **ARM и CRM подключены пунктиром с пояснением**, потому что в одобренном ТЗ есть только модуль `admin` (Admin Panel, FR-19.1) без определённых ролей (OQ-54) — ARM выглядит как его рабочий прототип. Модель данных CRM (артисты/группы/организации/сделки) в этом ТЗ вообще не описана; это самостоятельная инициатива, которую стоит официально сверить с продуктом, прежде чем встраивать в этот план.
- Важное решение лида продукта (2026-10-07), зафиксированное в документах: вся эта архитектура остаётся целевой и **не отменяется** — её реализация просто отложена до отдельного одобрения backend-вехи; текущая фаза — frontend only, на мок-данных.
