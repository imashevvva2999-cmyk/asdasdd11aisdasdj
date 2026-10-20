# apps/web — сайт Mmusic (React + Vite)

Отдельный сайт Mmusic: React 19 + Vite + TypeScript + React Router. React Native и Expo здесь не используются (запрет в `.oxlintrc.json`, проверка сборки `pnpm verify:no-native`). Мобильное приложение остаётся в `apps/mobile` и не меняется.

**Статус: W1 — каркас.** Есть адаптивная оболочка (desktop: плавающая стеклянная навигация по A3; телефон: утверждённая шапка и нижняя плавающая панель) и страницы-заглушки `/home`, `/search`, `/library`, `/profile`, 404. Контент переносится в фазах W3–W5.

```bash
pnpm --filter @mmusic/web dev        # http://127.0.0.1:5180
pnpm --filter @mmusic/web build      # dist/
pnpm --filter @mmusic/web preview    # http://127.0.0.1:5181
pnpm --filter @mmusic/web typecheck
pnpm --filter @mmusic/web lint
pnpm --filter @mmusic/web verify:no-native   # после build
```

- Дизайн-токены: `@mmusic/ui-kit/tokens` (только чтение) → CSS-переменные и классы `.t-*` (`src/styles/tokens.ts`).
- Шрифты: те же файлы Inter и Plus Jakarta Sans, что в мобильном приложении (`src/styles/fonts.ts`).
- Иконки вкладок: Material Icons (Apache-2.0), временно встроенные SVG до набора в `ui-kit` (W2).
