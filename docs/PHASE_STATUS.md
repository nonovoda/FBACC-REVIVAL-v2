# PHASE STATUS

## Текущий статус

- **Phase 1:** done
- **Phase 2:** done / stabilized

## Phase 2 стабилизация — ключевые итоги

- **Billing:** использует fallback, если часть полей `funding_source_details` недоступна или не поддерживается.
- **Ads:** загружает объявления по выбранному `ad account`.
- **Вкладки, требующие ad account:** при отсутствии выбранного аккаунта показывают warning-state с требованием выбрать аккаунт.

## QA Checklist (Phase 2)

- [ ] Accounts загружается.
- [ ] Businesses загружается.
- [ ] Pages загружается.
- [ ] Ads требует выбранный ad account, после выбора — загружается.
- [ ] Billing требует выбранный ad account, после выбора — загружается и использует fallback при недоступных billing-полях.
- [ ] Diagnostics загружается.
- [ ] Ошибки API логируются вместе с контекстом.
- [ ] Empty-state отделён от error-state.

## Черновой план Phase 3 — Controlled Actions Architecture (без реализации бизнес-actions)

1. **Action Capability Matrix**
   - Формализовать список разрешённых действий по модулям.
   - Для каждого действия определить: scope, required permissions, risk level, dry-run support.

2. **Policy Layer (Guardrails First)**
   - Ввести централизованные pre-check/policy guards перед любым action.
   - Добавить явные причины блокировки action (UI + log).

3. **Action Execution Pipeline**
   - Подготовить стандартный pipeline: validate context → validate permissions → dry-run preview → explicit confirm → execute.
   - Заложить единый формат action-result и action-error.

4. **Audit & Observability**
   - Спроектировать action-аудит: timestamp, actor context, target, input summary, outcome, error.
   - Отдельно описать redaction для чувствительных полей.

5. **UI Contracts for Controlled Actions**
   - Специфицировать reusable UI-компоненты: action cards, confirmation modal, progress log, result summary.
   - Зафиксировать UX-правила безопасного режима и массовых операций.

6. **Integration Readiness**
   - Определить точки интеграции с существующими модулями (без включения runtime business-actions).
   - Подготовить phased rollout-план с feature flags.
