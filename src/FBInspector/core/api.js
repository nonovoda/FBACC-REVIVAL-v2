import { GRAPH_API_BASE } from './config.js';

const buildUrl = (path, params = {}) => {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const url = new URL(cleanPath, GRAPH_API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const normalizeError = (error) => ({
  message: error?.message || 'Неизвестная ошибка API',
  code: error?.code || 'API_ERROR',
  raw: error
});

const withRetry = async (fn, options = {}) => {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 400;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
};

const request = async (method, path, { params = {}, body, accessToken, retries } = {}) => {
  if (!accessToken) {
    throw { message: 'Access token не найден', code: 'AUTH_TOKEN_MISSING' };
  }

  return withRetry(async () => {
    const url = buildUrl(path, { ...params, access_token: accessToken });
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw data.error || { message: `HTTP ${response.status}`, code: 'HTTP_ERROR' };
    }

    return data;
  }, { retries });
};

const getAllPages = async (path, { params = {}, accessToken, retries } = {}) => {
  const rows = [];
  let nextPath = path;
  let nextParams = { ...params };

  while (nextPath) {
    const payload = await request('GET', nextPath, { params: nextParams, accessToken, retries });
    if (Array.isArray(payload.data)) {
      rows.push(...payload.data);
    }

    if (!payload.paging?.next) {
      nextPath = null;
      continue;
    }

    const nextUrl = new URL(payload.paging.next);
    nextPath = `${nextUrl.pathname}${nextUrl.search}`;
    nextParams = {};
  }

  return rows;
};

export const fbApi = {
  get: (path, params, options = {}) => request('GET', path, { ...options, params }),
  post: (path, body, options = {}) => request('POST', path, { ...options, body }),
  delete: (path, params, options = {}) => request('DELETE', path, { ...options, params }),
  getAllPages,
  withRetry,
  normalizeError
};
