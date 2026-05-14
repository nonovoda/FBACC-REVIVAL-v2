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

## Phase 3 foundation progress

- Добавлен каркас Controlled Actions Architecture:
  - action registry;
  - policy guard layer;
  - unified action pipeline (resolve → policy → dry-run);
  - audit contract для action-событий.
- Реальные бизнес-actions **не включены**.

## Phase 3 foundation validation (зафиксировано)

- Action registry работает (действия регистрируются и читаются из реестра).
- Action policy блокирует execution по умолчанию (safe-by-default).
- Action audit логируется по pipeline-этапам.
- Вкладки Phase 2 (Accounts/Businesses/Pages/Ads/Billing/Diagnostics) не сломаны текущим foundation-слоем.

## Следующий шаг (короткий план)

1. Включить **первый safe controlled action** через pipeline в режиме read-only.
2. Сохранить policy guardrails и explicit confirm-подход.
3. Добавить расширенный audit для этого action (resolve/policy/execution outcome).
4. Destructive actions не включать.

## Phase 3 — шаг 1 реализован

- Включен первый safe controlled action: `accounts.load_snapshot`.
- Action проходит через pipeline-этапы: `resolve → policy → execution`.
- Execution для шага 1 только read-only (загрузка snapshot аккаунтов).
- Destructive actions по-прежнему не включены.
