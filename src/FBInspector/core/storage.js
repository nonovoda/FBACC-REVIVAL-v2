const KEY_PREFIX = 'fbinspector:';

const buildKey = (key) => `${KEY_PREFIX}${key}`;

const safeParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const storage = {
  get(key, fallback = null) {
    const raw = window.localStorage.getItem(buildKey(key));
    if (raw === null) {
      return fallback;
    }
    return safeParse(raw, fallback);
  },
  set(key, value) {
    window.localStorage.setItem(buildKey(key), JSON.stringify(value));
  },
  remove(key) {
    window.localStorage.removeItem(buildKey(key));
  },
  clear() {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(KEY_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  }
};
