import {
  FBINSPECTOR_INSTANCE_KEY,
  FBINSPECTOR_ROOT_ID,
  FBINSPECTOR_STYLE_ID
} from './core/config.js';
import { authService } from './core/auth.js';
import { fbApi } from './core/api.js';
import { logger } from './core/logger.js';
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

const phase2Modules = [
  accountsModule,
  businessesModule,
  pagesModule,
  billingModule,
  adsModule,
  diagnosticsModule
];

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

const createInstance = () => {
  const style = mountStyles();
  const root = mountRoot();
  const token = authService.getAccessToken();
  const initialAdAccountId = authService.getCurrentAdAccountId();

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
      selectedAdAccountId: initialAdAccountId ? String(initialAdAccountId).replace(/^act_/, '') : '',
      selectedBusinessId: ''
    },
    onSelect: (moduleId) => {
      loadModule(shell, moduleId);
    }
  });

  shell.appendLog(logger.info('Shell смонтирован'));

  const phase3Policy = {
    phase3ActionsEnabled: true,
    allowHighRiskActions: false
  };
  const registeredActions = actionsRegistry.list();
  shell.appendLog(logger.info(`Phase 3 foundation: зарегистрировано действий ${registeredActions.length}`));

  if (registeredActions.length > 0) {
    actionPipeline.run({
      actionId: 'accounts.load_snapshot',
      context: shell.getContext(),
      policy: phase3Policy,
      logger: (auditEntry) => shell.appendLog(logger.info(`Action audit: ${JSON.stringify(auditEntry)}`)),
      execute: async (action) => {
        if (action.id !== 'accounts.load_snapshot') {
          return { mode: 'dry_run', message: 'Для действия отсутствует execution handler.' };
        }

        const rows = await accountsModule.load({ accessToken: token });
        return {
          mode: 'read_only',
          loadedItems: rows.length,
          message: 'Safe action выполнен в режиме read-only.'
        };
      }
    }).then((result) => {
      if (!result.ok) {
        shell.appendLog(logger.warning(`Action pipeline: ${result.reason}`));
      } else {
        shell.appendLog(logger.success(result.message));
      }
    });
  }

  loadModule(shell, phase2Modules[0].id);

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
