# Диаграмма 4 — архитектура деплоя

Основано только на локальных файлах: `.vercel/project.json`, `apps/mobile/vercel.json`, `turbo.json`, `git remote -v`, `git ls-remote`. Всё, что нельзя проверить по файлам репозитория, явно помечено.

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
  classDef verified fill:#132b1f,stroke:#22c55e,color:#d7ffe8
  classDef unverified stroke-dasharray: 6 4,stroke:#f59e0b,color:#ffe8c8,fill:#2a1f10
  classDef local fill:#1a1a2e,stroke:#6366f1,color:#e0e0ff

  LOCAL["Локальная рабочая копия<br/>ветка w2-shared-foundations<br/>(этот checkout)"]:::local
  GH["GitHub origin<br/>imashevvva2999-cmyk/asdasdd11aisdasdj<br/>main @ f40b8f1 - ДО появления web/ARM/CRM"]:::unverified
  LOCAL -.->|"не запушено -<br/>web, arm, crm и последние изменения mobile<br/>существуют только локально"| GH

  BUILD["Turborepo build pipeline turbo.json<br/>build зависит от ^build, без Vercel-специфики<br/>web/arm/crm - обычный vite build"]:::verified

  subgraph VercelMobile["Vercel-проект mobile"]
    CFG1["apps/mobile/vercel.json<br/>buildCommand: pnpm build:web<br/>outputDirectory: dist<br/>закоммичено, привязано через .vercel/project.json"]:::verified
  end

  subgraph VercelOthers["Деплои Web / ARM / CRM"]
    CFG2["Нет vercel.json, нет привязки .vercel в репозитории<br/>для apps/web, apps/arm, apps/crm.<br/>Ручные vercel deploy из scratchpad-копий -<br/>не воспроизводимы из этого checkout,<br/>live-статус не проверяем локально"]:::unverified
  end

  API2["apps/api NestJS<br/>нет vercel.json, нет Dockerfile<br/>не задеплоен никуда"]:::unverified

  CI["CI/CD: нет<br/>нет .github/workflows -<br/>каждый деплой - ручной CLI-запуск"]:::unverified

  LOCAL --> BUILD
  BUILD --> CFG1
  BUILD -.-> CFG2
  LOCAL --> CFG1
  LOCAL -.->|"ручной CLI, не привязан к репо"| CFG2
```

## Заметки

- **Только `apps/mobile` имеет закоммиченную конфигурацию деплоя** (`apps/mobile/vercel.json` + `.vercel/project.json`, имя проекта «mobile»; ID проекта и команды Vercel — в локальном `.vercel/project.json`, который не хранится в git). Корневой `.vercel/project.json` указывает на тот же проект «mobile», а не на отдельный корневой проект.
- **У web/arm/crm нет ни `vercel.json`, ни привязки `.vercel`** в этом репозитории. Упомянутые в прошлых сессиях адреса вида `mmusic-web.vercel.app` / `mmusic-arm.vercel.app` / `mmusic-crm.vercel.app` нигде не встречаются ни в `docs/`, ни в README — это результат ручных `vercel deploy` из временных копий, а не часть репозитория. Их текущий live-статус **не проверяем локально**.
- **Git remote существует**, но сильно отстаёт: `origin/main` = `f40b8f1` — коммит **до** появления `apps/web`, `apps/arm`, `apps/crm`. Всё, что показано на диаграммах 1-3, существует только в локальной рабочей копии на ветке `w2-shared-foundations`. Потеря этой папки = потеря всей текущей работы по web/ARM/CRM.
- **CI/CD отсутствует полностью** — нет `.github/workflows`. Все деплои до сих пор делались вручную через Vercel CLI.
- `apps/api` не имеет никакой конфигурации деплоя (ни `vercel.json`, ни `Dockerfile`) — задел под backend существует только локально и нигде не запущен.
