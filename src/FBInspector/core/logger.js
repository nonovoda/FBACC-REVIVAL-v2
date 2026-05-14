export const logger = {
  info: (...args) => console.info('[FBInspector]', ...args),
  success: (...args) => console.log('[FBInspector]', ...args),
  warning: (...args) => console.warn('[FBInspector]', ...args),
  error: (...args) => console.error('[FBInspector]', ...args)
};
