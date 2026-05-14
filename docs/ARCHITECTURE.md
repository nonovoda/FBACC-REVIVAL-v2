# Architecture — FBInspector Foundation

## Директории
- `src/FBInspector/index.js` — entrypoint bookmarklet-инстанса.
- `src/FBInspector/core/*` — ядро (config, api, auth, logger, storage, utils).
- `src/FBInspector/ui/*` — UI-обвязка (shell, styles, tabs, table).
- `src/FBInspector/modules/*` — функциональные модули (Phase 2+).
- `scripts/build-fbinspector.js` — build pipeline.
- `dist/*` — build artifacts (генерируются автоматически).

## Принципы
- Только модульная архитектура.
- Никаких giant procedural файлов.
- Читаемый исходник в `src`, артефакты только в `dist`.
- Инициализация bookmarklet должна быть idempotent и безопасной.

## Жизненный цикл
1. Проверка существующего инстанса.
2. Safe destroy предыдущего инстанса (если есть).
3. Mount root + styles.
4. Init UI shell.
5. Экспорт API инстанса в `window` для повторного запуска.
