const timestamp = () => new Date().toLocaleTimeString('ru-RU', { hour12: false });

const emit = (level, message, meta = {}) => ({
  level,
  message,
  meta,
  ts: timestamp()
});

export const logger = {
  info: (message, meta) => emit('info', message, meta),
  success: (message, meta) => emit('success', message, meta),
  warning: (message, meta) => emit('warning', message, meta),
  error: (message, meta) => emit('error', message, meta)
};
