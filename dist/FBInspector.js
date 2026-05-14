(() => {
  // src/FBInspector/core/config.js
  var GRAPH_API_VERSION = "v25.0";
  var GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}/`;
  var FBINSPECTOR_ROOT_ID = "fbinspector-root";
  var FBINSPECTOR_STYLE_ID = "fbinspector-styles";
  var FBINSPECTOR_INSTANCE_KEY = "__FBINSPECTOR_INSTANCE__";

  // src/FBInspector/core/auth.js
  var getFromAdsContext = () => {
    const candidate = window?.require?.("AdsPEMainAppState")?.getState?.();
    if (!candidate) {
      return null;
    }
    return {
      accessToken: candidate.accessToken ?? null,
      userId: candidate.viewer?.id ?? null,
      adAccountId: candidate.selectedAccountID ?? null
    };
  };
  var safeDomTokenScan = () => {
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const text = script.textContent || "";
      const match = text.match(/EA[A-Za-z0-9]{20,}/);
      if (match) {
        return match[0];
      }
    }
    return null;
  };
  var authService = {
    getAccessToken() {
      if (typeof window.__accessToken === "string" && window.__accessToken.length > 20) {
        return window.__accessToken;
      }
      const adsContext = getFromAdsContext();
      if (adsContext?.accessToken) {
        return adsContext.accessToken;
      }
      return safeDomTokenScan();
    },
    getCurrentUserId() {
      const adsContext = getFromAdsContext();
      return window?.CurrentUserInitialData?.USER_ID ?? adsContext?.userId ?? null;
    },
    getCurrentAdAccountId() {
      const adsContext = getFromAdsContext();
      return adsContext?.adAccountId ?? null;
    },
    getDtsg() {
      return window?.DTSGInitialData?.token ?? null;
    },
    getSiteData() {
      return window?.SiteData ?? null;
    }
  };

  // src/FBInspector/core/api.js
  var buildUrl = (path, params = {}) => {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    const url = new URL(cleanPath, GRAPH_API_BASE);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== void 0 && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    return url;
  };
  var normalizeError = (error) => ({
    message: error?.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430 API",
    code: error?.code || "API_ERROR",
    raw: error
  });
  var withRetry = async (fn, options = {}) => {
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
  var request = async (method, path, { params = {}, body, accessToken, retries } = {}) => {
    if (!accessToken) {
      throw { message: "Access token \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", code: "AUTH_TOKEN_MISSING" };
    }
    return withRetry(async () => {
      const url = buildUrl(path, { ...params, access_token: accessToken });
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : void 0,
        body: body ? JSON.stringify(body) : void 0
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        throw data.error || { message: `HTTP ${response.status}`, code: "HTTP_ERROR" };
      }
      return data;
    }, { retries });
  };
  var getAllPages = async (path, { params = {}, accessToken, retries } = {}) => {
    const rows = [];
    let nextPath = path;
    let nextParams = { ...params };
    while (nextPath) {
      const payload = await request("GET", nextPath, { params: nextParams, accessToken, retries });
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
  var fbApi = {
    get: (path, params, options = {}) => request("GET", path, { ...options, params }),
    post: (path, body, options = {}) => request("POST", path, { ...options, body }),
    delete: (path, params, options = {}) => request("DELETE", path, { ...options, params }),
    getAllPages,
    withRetry,
    normalizeError
  };

  // src/FBInspector/core/logger.js
  var timestamp = () => (/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU", { hour12: false });
  var emit = (level, message, meta = {}) => ({
    level,
    message,
    meta,
    ts: timestamp()
  });
  var logger = {
    info: (message, meta) => emit("info", message, meta),
    success: (message, meta) => emit("success", message, meta),
    warning: (message, meta) => emit("warning", message, meta),
    error: (message, meta) => emit("error", message, meta)
  };

  // src/FBInspector/core/utils.js
  var safeRemoveNode = (node) => {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  };

  // src/FBInspector/ui/styles.js
  var baseStyles = `
  #fbinspector-root {
    all: initial;
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: Inter, "Segoe UI", Arial, sans-serif;
    color: #e8fff0;
  }
`;

  // src/FBInspector/ui/shell.js
  var createShell = ({ root }) => {
    const container = document.createElement("div");
    container.innerHTML = `
    <div style="background:#0f1715;border:1px solid #2b433a;border-radius:14px;padding:14px;min-width:320px;max-width:420px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#4dff8f;line-height:1.05;">FBInspector</div>
          <div style="font-size:11px;color:#99b3a6;">Phase 1 Foundation</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:12px;color:#c7e0d2;">\u041B\u043E\u0433 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</div>
      <pre data-role="log" style="margin-top:6px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;min-height:120px;max-height:220px;overflow:auto;font-size:12px;color:#e8fff0;"></pre>
    </div>
  `;
    root.appendChild(container);
    const logEl = container.querySelector('[data-role="log"]');
    return {
      appendLog(entry) {
        const line = `[${entry.ts}] [${entry.level}] ${entry.message}`;
        logEl.textContent += `${line}
`;
        logEl.scrollTop = logEl.scrollHeight;
      },
      destroy() {
        if (container.parentNode === root) {
          root.removeChild(container);
        }
      }
    };
  };

  // src/FBInspector/index.js
  var mountStyles = () => {
    const style = document.createElement("style");
    style.id = FBINSPECTOR_STYLE_ID;
    style.textContent = baseStyles;
    document.head.appendChild(style);
    return style;
  };
  var mountRoot = () => {
    const root = document.createElement("div");
    root.id = FBINSPECTOR_ROOT_ID;
    document.body.appendChild(root);
    return root;
  };
  var runSmokeTest = async (shell) => {
    const token = authService.getAccessToken();
    if (!token) {
      shell.appendLog(logger.error("\u0422\u043E\u043A\u0435\u043D \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0437\u0430\u043F\u0443\u0441\u043A \u0432 Ads Manager."));
      return;
    }
    shell.appendLog(logger.info("AuthService: \u0442\u043E\u043A\u0435\u043D \u043F\u043E\u043B\u0443\u0447\u0435\u043D, \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u044E API smoke test /me?fields=id,name"));
    try {
      const data = await fbApi.get("me", { fields: "id,name" }, { accessToken: token, retries: 1 });
      shell.appendLog(logger.success(`Smoke test OK: ${data.name || "unknown"} (${data.id || "no-id"})`));
    } catch (error) {
      const normalized = fbApi.normalizeError(error);
      shell.appendLog(logger.error(`Smoke test FAIL: ${normalized.message}`));
    }
  };
  var createInstance = () => {
    const style = mountStyles();
    const root = mountRoot();
    const shell = createShell({ root });
    shell.appendLog(logger.info("Shell \u0441\u043C\u043E\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D"));
    runSmokeTest(shell);
    return {
      destroy() {
        shell.appendLog(logger.warning("Destroy \u0432\u044B\u0437\u0432\u0430\u043D, \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E cleanup"));
        shell.destroy();
        safeRemoveNode(root);
        safeRemoveNode(style);
        if (window[FBINSPECTOR_INSTANCE_KEY] === this) {
          delete window[FBINSPECTOR_INSTANCE_KEY];
        }
      }
    };
  };
  var launch = () => {
    const existing = window[FBINSPECTOR_INSTANCE_KEY];
    if (existing && typeof existing.destroy === "function") {
      existing.destroy();
    }
    const instance = createInstance();
    window[FBINSPECTOR_INSTANCE_KEY] = instance;
    return instance;
  };
  launch();
})();
