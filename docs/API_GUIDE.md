# API Guide — FBInspector

## Цель
Единый API-слой для FBInspector с безопасными read-only запросами как базой для Phase 1/2.

## Базовые константы
- `GRAPH_API_VERSION = "v25.0"`
- `GRAPH_API_BASE = "https://graph.facebook.com/v25.0/"`

## Базовые требования
- `credentials: include`
- централизованная нормализация ошибок
- retry с ограничением попыток
- последовательная загрузка (rate-limit friendly)
- без legacy `__rev/__spin` и нестандартных AJAX endpoint

## Планируемый интерфейс
- `fbApi.get(path, params, options)`
- `fbApi.post(path, body, options)`
- `fbApi.delete(path, params, options)`
- `fbApi.getAllPages(path, params, options)`
- `fbApi.withRetry(fn, options)`
- `fbApi.normalizeError(error)`

## Политика безопасности
- Не логировать токены и чувствительные поля.
- Не выполнять destructive actions по умолчанию.
- Не отправлять запросы на внешние сервера.
