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

const runSmokeTest = async (shell) => {
  const token = authService.getAccessToken();
  if (!token) {
    shell.appendLog(logger.error('Токен доступа не найден. Проверьте запуск в Ads Manager.'));
    return;
  }

  shell.appendLog(logger.info('AuthService: токен получен, запускаю API smoke test /me?fields=id,name'));

  try {
    const data = await fbApi.get('me', { fields: 'id,name' }, { accessToken: token, retries: 1 });
    shell.appendLog(logger.success(`Smoke test OK: ${data.name || 'unknown'} (${data.id || 'no-id'})`));
  } catch (error) {
    const normalized = fbApi.normalizeError(error);
    shell.appendLog(logger.error(`Smoke test FAIL: ${normalized.message}`));
  }
};

const createInstance = () => {
  const style = mountStyles();
  const root = mountRoot();
  const shell = createShell({ root });
  shell.appendLog(logger.info('Shell смонтирован'));

  runSmokeTest(shell);

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
