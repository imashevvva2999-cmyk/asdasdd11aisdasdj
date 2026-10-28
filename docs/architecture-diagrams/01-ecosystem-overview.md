# Диаграмма 1 — обзор экосистемы Mmusic

Высокоуровневая схема всех четырёх приложений и того, что их на самом деле связывает — общие пакеты монорепозитория, а не общий backend.

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
  classDef mobile fill:#1e3a5f,stroke:#4d9fff,color:#e8f0ff
  classDef web fill:#1f3d2e,stroke:#4ade80,color:#e8fff0
  classDef arm fill:#4a2e12,stroke:#fb923c,color:#fff4e8
  classDef crm fill:#3a1f4d,stroke:#c084fc,color:#f5e8ff
  classDef shared fill:#2a2a2a,stroke:#9ca3af,color:#f0f0f0
  classDef future stroke-dasharray: 6 4,stroke:#f59e0b,color:#ffe8c8,fill:#2a1f10

  subgraph ConsumerApps["Приложения для слушателей"]
    MOBILE["Mmusic Mobile<br/>Expo / React Native<br/>apps/mobile"]:::mobile
    WEB["Mmusic Website<br/>Vite + React<br/>apps/web"]:::web
  end

  subgraph BackOfficeApps["Внутренние back-office приложения"]
    ARM["ARM<br/>рабочее место администратора/модератора<br/>apps/arm"]:::arm
    CRM["CRM<br/>работа с артистами и организациями<br/>apps/crm"]:::crm
  end

  subgraph Shared["Общие основы (pnpm workspace)"]
    CORE["@mmusic/core<br/>мок-каталог, аудио-движок,<br/>zustand-сторы, storage-адаптер"]:::shared
    UIKIT["@mmusic/ui-kit<br/>дизайн-токены, WebGL-визуалы,<br/>веб-компоненты, иконки"]:::shared
    BACKOFFICE["@mmusic/backoffice<br/>RBAC, i18n, демо-данные,<br/>собственный storage-слой"]:::shared
  end

  subgraph BackendNotUsed["Backend — не используется ни одним приложением сегодня"]
    API["apps/api — NestJS<br/>только hello-world + /health<br/>нереализованная заготовка"]:::future
  end

  MOBILE --> CORE & UIKIT
  WEB --> CORE & UIKIT
  ARM --> BACKOFFICE & UIKIT
  CRM --> BACKOFFICE & UIKIT
```

## Как это читать

- **Mobile и Website** — «пара» потребительских приложений: обе читают один и тот же мок-каталог и аудио-логику из `@mmusic/core`, обе используют `@mmusic/ui-kit`.
- **ARM и CRM** — отдельная «пара» back-office приложений: обе построены на `@mmusic/backoffice` (RBAC, демо-данные), а не на `@mmusic/core`. CRM вообще не импортирует `@mmusic/core` — в коде явно написано «CRM uses no @mmusic/core catalog data».
- **Единственное, что физически связывает все четыре приложения — `@mmusic/ui-kit`** (дизайн-токены и компоненты). Прямой связи между потребительскими и back-office приложениями нет: ни общего API, ни общей базы данных, ни общей сессии пользователя.
- **`apps/api`** существует в репозитории, но на сегодня в него никто не стучится — это задел под будущий backend (см. диаграмму 3).

Подробности по стеку и хранению данных — в диаграмме 2; по тому, что в этой картине запланировано, но не реализовано, — в диаграмме 3.
