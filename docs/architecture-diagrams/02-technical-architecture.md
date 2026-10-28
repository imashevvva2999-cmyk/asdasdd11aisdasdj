# Диаграмма 2 — техническая архитектура

Стек, точные версии и слой персистентности для каждого приложения — всё подтверждено по `package.json`/`vite.config`/коду, без предположений.

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
  classDef mobile fill:#1e3a5f,stroke:#4d9fff,color:#e8f0ff
  classDef web fill:#1f3d2e,stroke:#4ade80,color:#e8fff0
  classDef arm fill:#4a2e12,stroke:#fb923c,color:#fff4e8
  classDef crm fill:#3a1f4d,stroke:#c084fc,color:#f5e8ff
  classDef shared fill:#2a2a2a,stroke:#9ca3af,color:#f0f0f0
  classDef storage fill:#102a28,stroke:#2dd4bf,color:#e0fff8
  classDef future stroke-dasharray: 6 4,stroke:#f59e0b,color:#ffe8c8,fill:#2a1f10

  subgraph Apps["Четыре приложения"]
    direction LR
    M["Mmusic Mobile<br/>Expo ~57 · React Native 0.86.3<br/>React 19.2.3 · Expo Router<br/>Zustand 5.0.15 · Reanimated 4.5.1<br/>build: expo export --platform web<br/>dev :8081"]:::mobile
    W["Mmusic Website<br/>React 19.2.3 · Vite 8.3.2<br/>react-router 7.18.4 · TS 6.0.3 · Zustand 5<br/>dev :5180 / preview :5181"]:::web
    A["ARM<br/>React 19.2.3 · Vite 8.3.2 · react-router 7.18.4<br/>Zustand 5 · без авторизации, без backend (так и задумано)<br/>dev :5182 / preview :5183"]:::arm
    C["CRM<br/>React 19.2.3 · Vite 8.3.2 · react-router 7.18.4<br/>Zustand 5 · без авторизации, без backend (так и задумано)<br/>dev :5184 / preview :5185"]:::crm
  end

  subgraph SharedPkgs["Общие пакеты"]
    direction LR
    CORE["@mmusic/core<br/>чистый TS, без DOM/RN<br/>constants · lib · mocks<br/>audio · demo · promotion<br/>state (zustand-сторы)<br/>platform/storage-адаптер"]:::shared
    UIKIT["@mmusic/ui-kit<br/>tokens · visuals (WebGL)<br/>web (DOM-компоненты,<br/>встроенные иконки)"]:::shared
    BO["@mmusic/backoffice<br/>типы домена · RBAC (useRole)<br/>i18n · мок seed-данные<br/>свой storage (createSafeStorage)<br/>зависит только от ui-kit"]:::shared
  end

  subgraph Persistence["Хранение данных — только на клиенте, базы данных нет"]
    direction LR
    LS1["localStorage через core/platform/storage.ts<br/>mmusic:artist-account:&lt;user&gt;<br/>mmusic:liked-tracks:&lt;user&gt;<br/>mmusic:locale · mmusic:demo-artist<br/>mmusic:profile-avatar"]:::storage
    LS2["localStorage через packages/backoffice/storage.ts<br/>(другой, отдельный адаптер)<br/>seed-данные + версии миграций<br/>CRM data v6 / ARM data v5"]:::storage
  end

  subgraph Backend["Backend — не реализован"]
    API["apps/api — NestJS 12 (Express)<br/>6 файлов: hello-world GET /<br/>+ заглушка /health<br/>нет БД, нет роутов, нет авторизации"]:::future
    PAY["mobile-only: EXPO_PUBLIC_PAYMENTS_API_URL<br/>живой MBANK-адаптер платежей —<br/>переменная не задана, поэтому не используется"]:::future
  end

  M --> CORE & UIKIT
  W --> CORE & UIKIT
  A --> BO & UIKIT
  C --> BO & UIKIT

  CORE --> LS1
  BO --> LS2

  M -.->|"не настроено"| PAY
  PAY -.->|"вызвал бы"| API
```

## Заметки

- Все четыре приложения на **одних и тех же версиях** React 19.2.3 / Zustand 5 — стек унифицирован сознательно (см. `restructure-app-ui-kit` в истории проекта).
- **Два независимых storage-слоя**: `core/platform/storage.ts` (mobile+web) и `packages/backoffice/storage.ts` (ARM+CRM) не связаны между собой — у них разные ключи и разная логика адаптера.
- Единственный реальный `fetch()` к внешнему API во всём репозитории — `apps/mobile/src/lib/payments/mbank-payment.ts`, живой адаптер MBANK-платежей, включаемый флагом `EXPO_PUBLIC_MBANK_PAYMENT_MODE=live`. Сегодня этот флаг и `EXPO_PUBLIC_PAYMENTS_API_URL` не заданы, поэтому в проде используется демо-адаптер из `@mmusic/core`.
- `apps/api` (NestJS) — 6 файлов, `GET /` hello-world и заглушка `/health`. Ни БД-клиента, ни бизнес-роутов нет.
