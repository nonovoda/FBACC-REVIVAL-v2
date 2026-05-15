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

## Phase 3 — шаг 2 реализован

- Добавлен второй safe controlled action: `billing.load_snapshot` (read-only).
- Action требует выбранный ad account context и проходит через policy-guard.
- При отсутствии context блокируется как warning-state (без runtime error).

## Phase 3 — шаг 3 реализован

- Startup pipeline выбирает safe action по контексту:
  - если ad account не выбран → `accounts.load_snapshot`;
  - если ad account выбран → `billing.load_snapshot`.
- Это убирает лишний startup warning и сохраняет policy-safe поведение.

## Phase 3 — batched rollout (4 шага) реализован

1. Добавлены safe controlled actions:
   - `businesses.load_snapshot`
   - `pages.load_snapshot`
2. Execution handlers расширены для новых action-ов.
3. Унифицирован action-result формат:
   - `mode`, `loadedItems`, `durationMs`, `warnings`, `message`.
4. Обновлён статус фазы с фиксацией batch-подхода 3–4 шага за итерацию.

## Checkpoint (зафиксировано по логам от 2026-05-14)

- Shell инициализируется стабильно.
- Phase 3 startup action выполняется через pipeline с полным audit trail (`resolve`/`policy`/`execution`).
- `accounts.load_snapshot` успешно выполняется в read-only режиме.
- Вкладки `Accounts`, `Businesses`, `Pages`, `Diagnostics` стабильно загружаются.
- Вкладки `Billing`/`Ads` без ad account показывают корректный warning-state.
- При выбранном ad account:
  - `Billing` загружается, fallback по unsupported полю (`billing_status`) отрабатывает штатно;
  - `Ads` загружается корректно.
- Критичных ошибок по текущему этапу не выявлено.

## Phase 3 — следующий этап (batch) реализован

1. В action registry добавлен `listEnabled()` для безопасного отбора только разрешённых startup actions.
2. Startup action selection переведён на context-aware функцию выбора из enabled actions.
3. Controlled actions в startup снова зафиксированы как `disabled by default` (`phase3ActionsEnabled: false`).
4. При отключённом policy flag UI логирует явный warning и не запускает execution pipeline.

## Phase 3 — следующий шаг реализован

- В pipeline добавлен явный этап `confirm` между `policy` и `execution`.
- Для read-only / non-destructive action используется auto-confirm (`auto_confirm_read_only`).
- Для destructive action предусмотрена блокировка с `CONFIRMATION_REQUIRED` до явного подтверждения.
- Audit trail теперь включает: `resolve` → `policy` → `confirm` → `execution`.

## Checkpoint (зафиксировано по логам от 2026-05-15)

- Критичных ошибок не выявлено.
- Controlled actions в startup корректно остаются disabled-by-default (warning без runtime error).
- Вкладки `Accounts/Businesses/Pages/Diagnostics` загружаются стабильно.
- Вкладки `Billing/Ads` без ad account дают корректный warning-state.
- При выбранном ad account:
  - `Ads` загружается корректно;
  - `Billing` загружается, fallback по unsupported `billing_status` отрабатывает штатно.

## Phase 3 — следующий batch реализован

1. Добавлен safe action `diagnostics.load_snapshot` (read-only, non-destructive).
2. Execution handler расширен поддержкой `diagnostics.load_snapshot`.
3. Контракт безопасности unchanged: controlled actions по умолчанию disabled, destructive actions не включены.

## Phase 3 — batch ускорения реализован (3 шага)

1. В action registry добавлена выборка `listByModule(moduleId)` для модульной оркестрации действий.
2. В runtime добавлена карта `actionId -> executor` (modular executors), убрана цепочка множественных `if` для startup execution.
3. Добавлены служебные phase-метрики в лог startup (`enabled actions` по модулю) для ускоренной диагностики rollout.

## Phase 3 — следующий batch реализован (3 шага)

1. В policy добавлен action allowlist (`allowedActionIds`) для точечного контроля разрешённых действий.
2. Startup policy переведена на явный allowlist safe read-only actions.
3. В startup лог добавлен action catalog (метаданные enabled actions) для прозрачной диагностики rollout.

## Phase 3 — batch завершения реализован (4 шага)

1. Добавлен модуль `core/actions/executors.js` (централизация action executors).
2. В pipeline добавлен `precheck` stage (блокирует execution для disabled actions в registry).
3. В registry добавлена сводка `summarizeEnabledByModule()` для phase-диагностики.
4. Startup лог переведён на summary-by-module вместо точечного счётчика одного модуля.

## Roadmap check (промежуточно)

- ✅ Core inspector tabs работают в read-only режиме (`accounts/businesses/pages/billing/ads/diagnostics`).
- ✅ Billing/Ads context guard и fallback-логика для unsupported Graph fields работают.
- ✅ Phase 3 controlled-actions foundation (registry/policy/audit/pipeline/confirm/precheck) собран.
- ✅ Local persistence частично реализован: selected tab + selected context (ad account/business).
- ⏳ Controlled actions UI contracts (action cards / explicit confirm UI) ещё не реализованы.
- ⏳ Business/destructive actions не внедрялись (и остаются отключёнными по правилам безопасности).

## Phase 3 — следующий batch реализован (4 шага)

1. Вынесен executor runner `runActionExecutor()` для единообразного исполнения action handlers.
2. В policy добавлен helper `summarizePolicy()` для прозрачной startup-диагностики.
3. Startup лог теперь включает `policy summary` (enabled/high-risk/allowlist-size).
4. Runtime execution flow в `index.js` упрощён за счёт общего runner, без процедурного дублирования.

## Phase 3 — следующий batch реализован (3 шага)

1. Добавлен UI state-block `Controlled Actions` в shell.
2. Startup теперь выставляет явный action-state (safe mode / ready / no action).
3. После pipeline-run UI state синхронизируется с результатом (`success` / `warning`) без необходимости читать весь лог.

## Phase 3 — расширенный batch реализован (5 шагов)

1. В registry добавлены helper-методы `listReadonlyEnabled()` и `summarizeEnabledByRisk()`.
2. В pipeline добавлена обработка `execution` ошибок с audit-логом `execution:error` и кодом `EXECUTION_ERROR`.
3. В pipeline возвращается метрика `durationMs` для end-to-end времени выполнения действия.
4. В startup лог добавлены расширенные метрики rollout: read-only enabled count и summary by risk.
5. Добавлен документ `docs/ACTION_CAPABILITY_MATRIX.md` с текущей матрицей допустимых action-ов и правилами применения.
