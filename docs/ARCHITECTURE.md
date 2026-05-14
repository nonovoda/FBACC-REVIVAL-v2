# Architecture — FBInspector Phase 1 (Short Contract)

## Scope
Только foundation-слой: `core/*`, `ui/*`, `index.js`.
Бизнес-модули (`accounts`, `businesses`, `pages`) не реализуются на этом этапе.

## Runtime contract
1. `index.js` делает безопасный remount (destroy предыдущего инстанса).
2. Root + style монтируются в DOM.
3. UI shell отображает лог.
4. `AuthService` получает токен (или пишет явную ошибку).
5. `API wrapper` выполняет smoke request: `/me?fields=id,name`.
6. `destroy()` очищает root/style и снимает ссылку на instance.

## Core contracts
- `core/auth.js` — token/user/account/dtsg/site getters.
- `core/api.js` — `get/post/delete/getAllPages/withRetry/normalizeError`.
- `core/logger.js` — единый формат лог-сообщений для UI.
- `core/storage.js` — только под UI-state (без токенов).

## Build contract
Readable source (`src`) → `npm run build:fbinspector` →
`dist/FBInspector.js` + `dist/FBInspector.bookmarklet.txt`.
