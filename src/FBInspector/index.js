import {
  FBINSPECTOR_INSTANCE_KEY,
  FBINSPECTOR_ROOT_ID,
  FBINSPECTOR_STYLE_ID
} from './core/config.js';
import { authService } from './core/auth.js';
import { fbApi } from './core/api.js';
import { logger } from './core/logger.js';
import { storage } from './core/storage.js';
import { safeRemoveNode } from './core/utils.js';
import { baseStyles } from './ui/styles.js';
import { createShell } from './ui/shell.js';
import { accountsModule } from './modules/accounts.js';
import { businessesModule } from './modules/businesses.js';
import { pagesModule } from './modules/pages.js';
import { billingModule } from './modules/billing.js';
import { adsModule } from './modules/ads.js';
import { diagnosticsModule } from './modules/diagnostics.js';
import { actionsRegistry } from './core/actions/registry.js';
import { actionPipeline } from './core/actions/pipeline.js';
import { createActionExecutors, runActionExecutor } from './core/actions/executors.js';
import { summarizePolicy } from './core/actions/policy.js';

const phase2Modules = [
  accountsModule,
  businessesModule,
  pagesModule,
  billingModule,
  adsModule,
  diagnosticsModule
];

const STORAGE_KEYS = {
  selectedTab: 'selected_tab',
  selectedContext: 'selected_context'
};

const mountStyles = () => {
  const style = document.createElement('style');
  style.id = FBINSPECTOR_STYLE_ID;
  style.textContent = baseStyles;
  document.head.appendChild(style);
  return style;
};

const mountRoot = () => {
  const root = document.createElement('div');
  root.id = FBINSPECTOR_ROOT_ID;
  document.body.appendChild(root);
  return root;
};

const buildActionResult = ({ mode = 'read_only', rows = [], warnings = [], message = '', startedAt = 0 }) => ({
  mode,
  loadedItems: Array.isArray(rows) ? rows.length : 0,
  durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : 0,
  warnings,
  message
});

const selectStartupActionId = (context = {}, enabledActions = []) => {
  if (!Array.isArray(enabledActions) || !enabledActions.length) {
    return null;
  }

  if (context.selectedAdAccountId && enabledActions.some((action) => action.id === 'billing.load_snapshot')) {
    return 'billing.load_snapshot';
  }

  if (enabledActions.some((action) => action.id === 'accounts.load_snapshot')) {
    return 'accounts.load_snapshot';
  }

  return enabledActions[0].id;
};

const getActionMetadata = (action) => ({
  id: action.id,
  module: action.module,
  enabled: action.enabled,
  requiresAdAccount: action.requiresAdAccount,
  destructive: action.destructive,
  riskLevel: action.riskLevel
});

const formatActionStateMessage = ({ policySummary, startupActionId, enabledActions }) => {
  if (!policySummary.phase3ActionsEnabled) {
    return {
      tone: 'warning',
      text: `Controlled Actions отключены (safe mode). Enabled в реестре: ${enabledActions.length}.`
    };
  }

  if (!startupActionId) {
    return {
      tone: 'warning',
      text: 'Controlled Actions включены, но нет доступного startup action (проверьте enabled/allowlist).'
    };
  }

  return {
    tone: 'info',
    text: `Controlled Actions готовы: startup action ${startupActionId}.`
  };
};

const createInstance = () => {
  const style = mountStyles();
  const root = mountRoot();
  const token = authService.getAccessToken();
  const initialAdAccountId = authService.getCurrentAdAccountId();
  const storedContext = storage.get(STORAGE_KEYS.selectedContext, {});
  const storedTab = storage.get(STORAGE_KEYS.selectedTab, null);

  const loadModule = async (shell, moduleId) => {
    const selectedModule = phase2Modules.find((item) => item.id === moduleId);
    if (!selectedModule) {
      shell.appendLog(logger.warning(`Модуль ${moduleId} не найден`));
      return;
    }

    if (!token) {
      shell.appendLog(logger.error('Токен доступа не найден. Запустите скрипт в Ads Manager.'));
      shell.renderRows([]);
      return;
    }

    const context = shell.getContext();
    shell.appendLog(logger.info(`Загрузка вкладки: ${selectedModule.title}`));
    shell.appendLog(logger.info(`Контекст: adAccount=${context.selectedAdAccountId || 'не выбран'}, business=${context.selectedBusinessId || 'не выбран'}`));

    if (selectedModule.requiresAccountContext && !context.selectedAdAccountId) {
      shell.appendLog(logger.warning('Требуется выбрать ad account для загрузки этой вкладки.'));
      shell.renderRows([]);
      return;
    }

    const logDebug = (message, meta = {}) => {
      shell.appendLog(logger.info(`${message}: ${JSON.stringify(meta)}`));
    };

    try {
      const rows = await selectedModule.load({ accessToken: token, context, logDebug });
      shell.renderRows(rows);
      if (!rows.length) {
        shell.appendLog(logger.warning('Данные не найдены, API вернул пустой список без ошибки'));
      } else {
        shell.appendLog(logger.success(`Загружено записей: ${rows.length}`));
      }
    } catch (error) {
      const normalized = fbApi.normalizeError(error);
      shell.appendLog(logger.error(`Ошибка загрузки ${selectedModule.title}: ${normalized.message}`));
      shell.appendLog(logger.error(`Объект ошибки: ${JSON.stringify(normalized.raw || error)}`));
      shell.renderRows([]);
    }
  };

  const shell = createShell({
    root,
    tabs: phase2Modules,
    initialContext: {
      selectedAdAccountId: storedContext?.selectedAdAccountId || (initialAdAccountId ? String(initialAdAccountId).replace(/^act_/, '') : ''),
      selectedBusinessId: storedContext?.selectedBusinessId || ''
    },
    initialTabId: storedTab,
    onContextChange: (nextContext) => {
      storage.set(STORAGE_KEYS.selectedContext, nextContext);
    },
    onSelect: (moduleId) => {
      storage.set(STORAGE_KEYS.selectedTab, moduleId);
      loadModule(shell, moduleId);
    }
  });

  shell.appendLog(logger.info('Shell смонтирован'));

  const phase3Policy = {
    phase3ActionsEnabled: false,
    allowHighRiskActions: false,
    allowedActionIds: [
      'accounts.load_snapshot',
      'billing.load_snapshot',
      'businesses.load_snapshot',
      'pages.load_snapshot',
      'diagnostics.load_snapshot'
    ]
  };
  const registeredActions = actionsRegistry.list();
  const enabledActions = actionsRegistry.listEnabled();
  const readonlyEnabledActions = actionsRegistry.listReadonlyEnabled();
  const summaryByModule = actionsRegistry.summarizeEnabledByModule();
  const summaryByRisk = actionsRegistry.summarizeEnabledByRisk();
  shell.appendLog(logger.info(`Phase 3 foundation: зарегистрировано действий ${registeredActions.length}`));
  shell.appendLog(logger.info(`Phase 3 foundation: enabled действий ${enabledActions.length}`));
  shell.appendLog(logger.info(`Phase 3 foundation: read-only enabled действий ${readonlyEnabledActions.length}`));
  shell.appendLog(logger.info(`Phase 3 foundation: summary by module ${JSON.stringify(summaryByModule)}`));
  shell.appendLog(logger.info(`Phase 3 foundation: summary by risk ${JSON.stringify(summaryByRisk)}`));
  shell.appendLog(logger.info(`Phase 3 foundation: policy summary ${JSON.stringify(summarizePolicy(phase3Policy))}`));
  shell.appendLog(logger.info(`Phase 3 foundation: action catalog ${JSON.stringify(enabledActions.map(getActionMetadata))}`));
  const startupContext = shell.getContext();
  const startupActionId = selectStartupActionId(startupContext, enabledActions);
  const policySummary = summarizePolicy(phase3Policy);
  const actionState = formatActionStateMessage({ policySummary, startupActionId, enabledActions });
  shell.setActionState(actionState.text, actionState.tone);

  if (!phase3Policy.phase3ActionsEnabled) {
    shell.appendLog(logger.warning('Controlled actions отключены по умолчанию. Для запуска включите policy flag phase3ActionsEnabled.'));
  } else if (startupActionId) {
    actionPipeline.run({
      actionId: startupActionId,
      context: startupContext,
      policy: phase3Policy,
      logger: (auditEntry) => shell.appendLog(logger.info(`Action audit: ${JSON.stringify(auditEntry)}`)),
      execute: async (action, context) => {
        const logDebug = (message, meta = {}) => {
          shell.appendLog(logger.info(`${message}: ${JSON.stringify(meta)}`));
        };
        const startedAt = Date.now();
        const actionExecutors = createActionExecutors({
          modules: { accountsModule, billingModule, businessesModule, pagesModule, diagnosticsModule },
          accessToken: token,
          context,
          logDebug
        });
        const execution = await runActionExecutor({ actionId: action.id, executors: actionExecutors });
        if (execution.ok) {
          const actionTitle = action.title || action.id;
          return buildActionResult({ rows: execution.rows, message: `${actionTitle} выполнен.`, startedAt });
        }

        return buildActionResult({
          mode: 'dry_run',
          rows: execution.rows,
          warnings: execution.warnings,
          message: 'Execution handler не найден.',
          startedAt
        });
      }
    }).then((result) => {
      if (!result.ok) {
        shell.appendLog(logger.warning(`Action pipeline: ${result.reason}`));
        shell.setActionState(`Controlled Actions: ${result.reason}`, 'warning');
      } else {
        shell.appendLog(logger.info(`Action pipeline duration: ${result.durationMs}ms`));
        shell.appendLog(logger.success(result.message));
        shell.setActionState(`Controlled Actions: ${result.message}`, 'info');
      }
    });
  } else {
    shell.appendLog(logger.warning('Нет доступных enabled controlled actions для startup pipeline.'));
    shell.setActionState('Controlled Actions: нет доступных startup action.', 'warning');
  }

  loadModule(shell, shell.initialTabId || phase2Modules[0].id);

  return {
    destroy() {
      shell.appendLog(logger.warning('Destroy вызван, выполняю cleanup'));
      shell.destroy();
      safeRemoveNode(root);
      safeRemoveNode(style);
      if (window[FBINSPECTOR_INSTANCE_KEY] === this) {
        delete window[FBINSPECTOR_INSTANCE_KEY];
      }
    }
  };
};

const launch = () => {
  const existing = window[FBINSPECTOR_INSTANCE_KEY];
  if (existing && typeof existing.destroy === 'function') {
    existing.destroy();
  }

  const instance = createInstance();
  window[FBINSPECTOR_INSTANCE_KEY] = instance;
  return instance;
};

launch();
