# Диаграмма 3 — поток данных: сегодня и по плану

Явно разделяет то, что подтверждено в коде («сегодня»), и то, что только задокументировано в `docs/architecture.md` как цель backend-вехи, которая ещё не начата.

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
  classDef mobile fill:#1e3a5f,stroke:#4d9fff,color:#e8f0ff
  classDef web fill:#1f3d2e,stroke:#4ade80,color:#e8fff0
  classDef arm fill:#4a2e12,stroke:#fb923c,color:#fff4e8
  classDef crm fill:#3a1f4d,stroke:#c084fc,color:#f5e8ff
  classDef future stroke-dasharray: 6 4,stroke:#f59e0b,color:#ffe8c8,fill:#2a1f10
  classDef note fill:#1a1a1a,stroke:#555,color:#aaa

  NOTE["Сегодня нет общего API, базы данных или сессии авторизации<br/>между Mobile, Website, ARM и CRM.<br/>Каждый блок ниже — изолированный локальный/мок контур данных."]:::note

  M["Mobile<br/>core/mocks каталог + localStorage<br/>(лайки, locale, artist-account)"]:::mobile
  W["Website<br/>core/mocks каталог + localStorage<br/>(лайки, locale, artist-account)"]:::web
  AR["ARM<br/>backoffice seed/migrate (data v5)<br/>staff, roles, матрица прав"]:::arm
  CR["CRM<br/>backoffice seed/migrate (data v6)<br/>артисты, группы, организации, сделки, кампании"]:::crm

  subgraph Planned["ЗАПЛАНИРОВАНО — docs/architecture.md §1, §3 (Фазы 8-9, backend-веха не начата)"]
    AUTH["auth: MBANK IdP <-> сессия Mmusic"]:::future
    CATALOG["catalog: собственная БД Mmusic (PostgreSQL)"]:::future
    MOD["модерация/проверка загруженных треков<br/>(роли и процесс не определены - OQ-49)"]:::future
    PLAY["playback: подписанные CDN-ссылки"]:::future
    DON["donations: MBANK Payments API<br/>+ биометрическое подтверждение"]:::future
    AN["analytics -> выгрузка в системы банка"]:::future
  end

  M -.->|"future: вход через банк"| AUTH
  W -.->|"future: вход через банк"| AUTH
  M -.->|"future: Upload Track S-28"| CATALOG
  W -.->|"future: Upload Track S-28"| CATALOG
  AR -.->|"ARM - рабочий прототип для подтверждённого,<br/>но не спроектированного Admin Panel FR-19.1"| MOD
  CATALOG -.-> MOD
  MOD -.->|"future: одобренный трек"| CATALOG
  CATALOG -.-> PLAY
  M -.->|"future: Support / донат"| DON
  W -.->|"future: Support / донат"| DON
  M -.-> AN
  CR -.->|"модель CRM артисты/орг./сделки не описана<br/>в docs/architecture.md - доп. прототип вне ТЗ"| MOD
```

## Что это означает

**Реально движется сегодня:** внутри каждого приложения — из мок-данных в состояние (zustand) и обратно в `localStorage`. Между приложениями данные не движутся вообще: трек, опубликованный в демо-кабинете артиста на мобильном, не появляется ни в CRM, ни в ARM; роль, выданная в ARM, не видна в CRM; ничего из CRM не попадает в каталог Mobile/Website.

**Запланировано (по `docs/architecture.md` §1/§3/§5, `docs/technical-specification.md` §3.19), но не реализовано:**
- `auth` — обмен токена MBANK на сессию Mmusic;
- `catalog` — собственная БД Mmusic, наполняется через Upload Track (S-28) и будущую Admin Panel;
- модерация загруженных треков — роль и процесс явно не определены (**OQ-49**);
- `playback` — отдача аудио через CDN по подписанным URL;
- `donations` — донат через MBANK Payments API с биометрическим подтверждением; вопрос комиссии платформы не решён (**OQ-10**);
- `analytics` — выгрузка событий в системы банка.

**Важный пробел для обсуждения:** в ТЗ подтверждён, но не спроектирован модуль **Admin Panel** (FR-19.1, роли/права — **OQ-54**). ARM выглядит как рабочий прототип именно этого модуля. А вот модель данных CRM (артисты как юрлица, группы, организации, сделки) **не описана ни в одном утверждённом документе** — это самостоятельная инициатива, которую стоит явно сверить с product-владельцем перед тем, как на неё опирается дальнейшая архитектура.
