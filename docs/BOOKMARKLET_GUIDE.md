# Bookmarklet Guide — FBInspector

## Build flow
`src` readable modules → `dist/FBInspector.js` → `dist/FBInspector.bookmarklet.txt`

## Требования
- Формат output: IIFE.
- Bookmarklet-артефакт должен начинаться с `javascript:`.
- Повторный запуск не должен оставлять «мусор» в DOM.
- `destroy()` обязан удалять root и style-узел.

## Команды
- `npm run build:fbinspector`
- `npm run watch:fbinspector`

## Запрещено
- Редактировать `dist` вручную.
- Использовать packed/compressed source architecture.
