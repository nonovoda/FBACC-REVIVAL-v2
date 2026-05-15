# LESSONS LEARNED (Phase 1–2)

Короткий практический документ. Обновлять регулярно по мере развития проекта.

## 1) Unsupported Graph API fields не должны ломать вкладки

- При `OAuthException (#100)`:
  - логировать `unavailable fields`;
  - выполнять fallback request без проблемных полей;
  - не ронять UI и не ломать таб.

## 2) Empty state и error state — разные состояния

- `0 записей` ≠ `ошибка API`.
- Empty-state показывается только при успешном ответе без данных.
- Error-state показывает причину ошибки и контекст.

## 3) Вкладки с обязательным ad account context

- Должны явно показывать warning-state, если ad account не выбран.
- Не должны делать silent-запросы без контекста.

## 4) Обязательный logging contract для Ads/Billing

Лог должен включать:
- endpoint;
- params;
- selected context;
- raw response summary;
- normalized items count;
- structured error object.

## 5) Phase gate перед переходом к новой фазе

Перед переходом:
- завершить phase stabilization;
- пройти QA checklist;
- получить successful build;
- провести regression check.

## 6) Controlled Actions (Phase 3+) — обязательные правила

- Controlled actions должны быть `disabled by default` до явного включения.
- Action pipeline обязан логировать стадии: `resolve` / `policy` / `execution`.
- Policy-блокировка должна отражаться как `warning-state`, а не как runtime error.
- Для startup использовать только `enabled` actions из реестра; выбор action должен быть context-aware.
- Перед execution должен быть отдельный confirm-stage; для read-only возможен auto-confirm, для destructive — только явное подтверждение.
- Для масштабирования Phase 3 использовать mapping `actionId -> executor`, чтобы расширять 3–4 действия за batch без процедурного роста кода.
