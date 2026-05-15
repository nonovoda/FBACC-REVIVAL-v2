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

  // src/FBInspector/ui/tabs.js
  var createTabs = ({ root, tabs, onSelect }) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "6px";
    wrapper.style.marginTop = "10px";
    wrapper.style.marginBottom = "10px";
    const buttons = /* @__PURE__ */ new Map();
    const setActiveTab = (id) => {
      buttons.forEach((button, tabId) => {
        button.style.borderColor = tabId === id ? "#4dff8f" : "#2f4a40";
        button.style.color = tabId === id ? "#4dff8f" : "#c7e0d2";
      });
    };
    tabs.forEach((tab, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tab.title;
      button.style.background = "#121f1b";
      button.style.border = "1px solid #2f4a40";
      button.style.borderRadius = "8px";
      button.style.padding = "6px 8px";
      button.style.fontSize = "12px";
      button.style.cursor = "pointer";
      button.onclick = () => {
        setActiveTab(tab.id);
        onSelect(tab.id);
      };
      buttons.set(tab.id, button);
      wrapper.appendChild(button);
      if (index === 0) {
        setActiveTab(tab.id);
      }
    });
    root.appendChild(wrapper);
    return { destroy: () => root.removeChild(wrapper), setActiveTab };
  };

  // src/FBInspector/ui/table.js
  var createTable = ({ root }) => {
    const pre = document.createElement("pre");
    pre.style.marginTop = "8px";
    pre.style.background = "#0b1210";
    pre.style.border = "1px solid #22372f";
    pre.style.borderRadius = "10px";
    pre.style.padding = "8px";
    pre.style.minHeight = "120px";
    pre.style.maxHeight = "240px";
    pre.style.overflow = "auto";
    pre.style.fontSize = "12px";
    pre.style.color = "#e8fff0";
    root.appendChild(pre);
    return {
      render(rows) {
        pre.textContent = JSON.stringify(rows, null, 2);
      },
      destroy() {
        root.removeChild(pre);
      }
    };
  };

  // src/FBInspector/ui/shell.js
  var createShell = ({ root, tabs, onSelect, initialContext = {} }) => {
    const container = document.createElement("div");
    container.innerHTML = `
    <div style="background:#0f1715;border:1px solid #2b433a;border-radius:14px;padding:14px;min-width:320px;max-width:560px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#4dff8f;line-height:1.05;">FBInspector</div>
          <div style="font-size:11px;color:#99b3a6;">Phase 2 Read-only Inspector</div>
        </div>
      </div>
      <div data-role="tabs"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:#c7e0d2;">
          ID \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430
          <input data-role="ad-account-input" placeholder="\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 123456789" style="background:#121f1b;border:1px solid #2f4a40;border-radius:9px;padding:8px;color:#e8fff0;font-size:12px;" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:#c7e0d2;">
          ID \u0431\u0438\u0437\u043D\u0435\u0441\u0430
          <input data-role="business-input" placeholder="\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E" style="background:#121f1b;border:1px solid #2f4a40;border-radius:9px;padding:8px;color:#e8fff0;font-size:12px;" />
        </label>
      </div>
      <div data-role="table"></div>
      <div style="margin-top:10px;font-size:12px;color:#c7e0d2;">\u041B\u043E\u0433 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</div>
      <pre data-role="log" style="margin-top:6px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;min-height:100px;max-height:180px;overflow:auto;font-size:12px;color:#e8fff0;"></pre>
    </div>
  `;
    root.appendChild(container);
    const logEl = container.querySelector('[data-role="log"]');
    const adAccountInput = container.querySelector('[data-role="ad-account-input"]');
    const businessInput = container.querySelector('[data-role="business-input"]');
    const tabsRoot = container.querySelector('[data-role="tabs"]');
    const tableRoot = container.querySelector('[data-role="table"]');
    const tabsUi = createTabs({ root: tabsRoot, tabs, onSelect });
    const tableUi = createTable({ root: tableRoot });
    adAccountInput.value = initialContext.selectedAdAccountId || "";
    businessInput.value = initialContext.selectedBusinessId || "";
    return {
      appendLog(entry) {
        const line = `[${entry.ts}] [${entry.level}] ${entry.message}`;
        logEl.textContent += `${line}
`;
        logEl.scrollTop = logEl.scrollHeight;
      },
      renderRows(rows) {
        tableUi.render(rows);
      },
      getContext() {
        return {
          selectedAdAccountId: adAccountInput.value.trim(),
          selectedBusinessId: businessInput.value.trim()
        };
      },
      destroy() {
        tabsUi.destroy();
        tableUi.destroy();
        if (container.parentNode === root) {
          root.removeChild(container);
        }
      }
    };
  };

  // src/FBInspector/modules/accounts.js
  var accountsModule = {
    id: "accounts",
    title: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B",
    async load({ accessToken }) {
      const data = await fbApi.get("me/adaccounts", {
        fields: "id,name,account_status,currency,timezone_name,business",
        limit: 50
      }, { accessToken, retries: 1 });
      return data.data || [];
    }
  };

  // src/FBInspector/modules/businesses.js
  var businessesModule = {
    id: "businesses",
    title: "\u0411\u0438\u0437\u043D\u0435\u0441\u044B",
    async load({ accessToken }) {
      const data = await fbApi.get("me/businesses", {
        fields: "id,name,verification_status",
        limit: 50
      }, { accessToken, retries: 1 });
      return data.data || [];
    }
  };

  // src/FBInspector/modules/pages.js
  var pagesModule = {
    id: "pages",
    title: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    async load({ accessToken }) {
      const data = await fbApi.get("me/accounts", {
        fields: "id,name,category",
        limit: 50
      }, { accessToken, retries: 1 });
      return data.data || [];
    }
  };

  // src/FBInspector/modules/billing.js
  var normalizeFundingSource = (item = {}) => ({
    id: item.id ?? null,
    type: item.type ?? null,
    display_string: item.display_string ?? null,
    billing_status: item.billing_status ?? null
  });
  var extractMissingFieldFromError = (error) => {
    const message = error?.message || "";
    const match = message.match(/nonexisting field \(([^)]+)\)/i);
    return match?.[1] ?? null;
  };
  var billingModule = {
    id: "billing",
    title: "\u0411\u0438\u043B\u043B\u0438\u043D\u0433",
    requiresAccountContext: true,
    async load({ accessToken, context = {}, logDebug }) {
      const adAccountId = context.selectedAdAccountId;
      if (!adAccountId) {
        throw {
          code: "BILLING_ACCOUNT_CONTEXT_REQUIRED",
          message: "\u0414\u043B\u044F \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \xAB\u0411\u0438\u043B\u043B\u0438\u043D\u0433\xBB \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 ad account \u0432 \u043F\u043E\u043B\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430."
        };
      }
      const endpoint = `act_${adAccountId}`;
      const baseFields = "id,name,account_status,amount_spent,balance,currency";
      const requestedFundingFields = ["type", "display_string", "billing_status"];
      let activeFundingFields = [...requestedFundingFields];
      const createParams = () => ({
        fields: `${baseFields},funding_source_details{${activeFundingFields.join(",")}}`
      });
      let params = createParams();
      logDebug("Billing: \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430", { endpoint, params, context });
      let payload;
      try {
        payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
      } catch (error) {
        const missingField = extractMissingFieldFromError(error);
        if (error?.code === 100 && missingField && activeFundingFields.includes(missingField)) {
          activeFundingFields = activeFundingFields.filter((field) => field !== missingField);
          params = createParams();
          logDebug("Billing: \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435", {
            message: "\u0427\u0430\u0441\u0442\u044C \u043F\u043E\u043B\u0435\u0439 billing \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430, \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u0435\u0437 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044F",
            unavailableFields: [missingField],
            errorObject: error,
            retryParams: params
          });
          payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
        } else {
          throw error;
        }
      }
      const rawFunding = payload?.funding_source_details;
      const rawItems = Array.isArray(rawFunding) ? rawFunding : rawFunding ? [rawFunding] : [];
      const normalizedItems = rawItems.map((item) => normalizeFundingSource(item));
      logDebug("Billing: \u0441\u0432\u043E\u0434\u043A\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 API", {
        endpoint,
        rawSummary: {
          accountId: payload?.id ?? null,
          accountName: payload?.name ?? null,
          hasFundingSourceDetails: Boolean(rawFunding),
          fundingSourceType: Array.isArray(rawFunding) ? "array" : typeof rawFunding,
          requestedFundingFields,
          activeFundingFields,
          unavailableFundingFields: requestedFundingFields.filter((field) => !activeFundingFields.includes(field))
        },
        itemsBeforeNormalize: rawItems.length,
        itemsAfterNormalize: normalizedItems.length
      });
      if (!normalizedItems.length) {
        return [{
          account_id: payload?.id ?? null,
          account_name: payload?.name ?? null,
          billing_status: payload?.account_status ?? null,
          amount_spent: payload?.amount_spent ?? null,
          balance: payload?.balance ?? null,
          currency: payload?.currency ?? null
        }];
      }
      return normalizedItems;
    }
  };

  // src/FBInspector/modules/ads.js
  var normalizeAdsRows = (items = []) => items.map((item) => ({
    id: item.id ?? null,
    name: item.name ?? "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
    status: item.status ?? null,
    effective_status: item.effective_status ?? null,
    campaign_id: item.campaign_id ?? null,
    adset_id: item.adset_id ?? null,
    creative_id: item.creative?.id ?? null
  }));
  var adsModule = {
    id: "ads",
    title: "\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F",
    requiresAccountContext: true,
    async load({ accessToken, context = {}, logDebug }) {
      const adAccountId = context.selectedAdAccountId;
      if (!adAccountId) {
        throw {
          code: "ADS_ACCOUNT_CONTEXT_REQUIRED",
          message: "\u0414\u043B\u044F \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \xAB\u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F\xBB \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 ad account \u0432 \u043F\u043E\u043B\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430."
        };
      }
      const endpoint = `act_${adAccountId}/ads`;
      const params = {
        fields: "id,name,status,effective_status,campaign_id,adset_id,creative{id}",
        limit: 100
      };
      logDebug("Ads: \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430", { endpoint, params, context });
      const payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
      const rawItems = Array.isArray(payload?.data) ? payload.data : [];
      const normalizedItems = normalizeAdsRows(rawItems);
      logDebug("Ads: \u0441\u0432\u043E\u0434\u043A\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 API", {
        endpoint,
        rawSummary: {
          hasDataArray: Array.isArray(payload?.data),
          dataLength: rawItems.length,
          pagingNext: Boolean(payload?.paging?.next)
        },
        itemsBeforeNormalize: rawItems.length,
        itemsAfterNormalize: normalizedItems.length
      });
      return normalizedItems;
    }
  };

  // src/FBInspector/modules/diagnostics.js
  var diagnosticsModule = {
    id: "diagnostics",
    title: "\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430",
    async load({ accessToken }) {
      const me = await fbApi.get("me", { fields: "id,name" }, { accessToken, retries: 1 });
      return [me];
    }
  };

  // src/FBInspector/core/actions/registry.js
  var ACTION_RISK_LEVELS = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high"
  };
  var registry = [
    {
      id: "accounts.load_snapshot",
      title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C snapshot \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432",
      module: "accounts",
      requiresAdAccount: false,
      destructive: false,
      enabled: true,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "ads.refresh_snapshot",
      title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C snapshot \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0439",
      module: "ads",
      requiresAdAccount: true,
      destructive: false,
      enabled: false,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "billing.refresh_snapshot",
      title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C snapshot \u0431\u0438\u043B\u043B\u0438\u043D\u0433\u0430",
      module: "billing",
      requiresAdAccount: true,
      destructive: false,
      enabled: false,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "billing.load_snapshot",
      title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C snapshot \u0431\u0438\u043B\u043B\u0438\u043D\u0433\u0430",
      module: "billing",
      requiresAdAccount: true,
      destructive: false,
      enabled: true,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "businesses.load_snapshot",
      title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C snapshot \u0431\u0438\u0437\u043D\u0435\u0441\u043E\u0432",
      module: "businesses",
      requiresAdAccount: false,
      destructive: false,
      enabled: true,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "pages.load_snapshot",
      title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C snapshot \u0441\u0442\u0440\u0430\u043D\u0438\u0446",
      module: "pages",
      requiresAdAccount: false,
      destructive: false,
      enabled: true,
      riskLevel: ACTION_RISK_LEVELS.LOW
    },
    {
      id: "diagnostics.load_snapshot",
      title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C snapshot \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438",
      module: "diagnostics",
      requiresAdAccount: false,
      destructive: false,
      enabled: true,
      riskLevel: ACTION_RISK_LEVELS.LOW
    }
  ];
  var actionsRegistry = {
    list() {
      return registry.map((action) => ({ ...action }));
    },
    listEnabled() {
      return registry.filter((action) => action.enabled).map((action) => ({ ...action }));
    },
    getById(actionId) {
      return registry.find((action) => action.id === actionId) ?? null;
    },
    listByModule(moduleId) {
      return registry.filter((action) => action.module === moduleId).map((action) => ({ ...action }));
    },
    summarizeEnabledByModule() {
      return registry.reduce((acc, action) => {
        const key = action.module || "unknown";
        if (!acc[key]) {
          acc[key] = { total: 0, enabled: 0 };
        }
        acc[key].total += 1;
        if (action.enabled) {
          acc[key].enabled += 1;
        }
        return acc;
      }, {});
    },
    listReadonlyEnabled() {
      return registry.filter((action) => action.enabled && !action.destructive).map((action) => ({ ...action }));
    },
    summarizeEnabledByRisk() {
      return registry.reduce((acc, action) => {
        if (!action.enabled) {
          return acc;
        }
        const risk = action.riskLevel || "unknown";
        if (!acc[risk]) {
          acc[risk] = 0;
        }
        acc[risk] += 1;
        return acc;
      }, {});
    }
  };

  // src/FBInspector/core/actions/policy.js
  var basePolicy = {
    phase3ActionsEnabled: false,
    allowHighRiskActions: false,
    allowedActionIds: []
  };
  var buildDenied = (reasonCode, reason) => ({
    allowed: false,
    reasonCode,
    reason
  });
  var actionPolicy = {
    evaluate(action, context = {}, policy = basePolicy) {
      if (!action) {
        return buildDenied("ACTION_NOT_FOUND", "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u0440\u0435\u0435\u0441\u0442\u0440\u0435.");
      }
      if (!policy.phase3ActionsEnabled) {
        return buildDenied("PHASE3_ACTIONS_DISABLED", "Phase 3 actions \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u043E\u0439 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438.");
      }
      if (Array.isArray(policy.allowedActionIds) && policy.allowedActionIds.length > 0 && !policy.allowedActionIds.includes(action.id)) {
        return buildDenied("ACTION_NOT_ALLOWED", "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 allowlist \u0442\u0435\u043A\u0443\u0449\u0435\u0439 policy-\u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438.");
      }
      if (action.requiresAdAccount && !context.selectedAdAccountId) {
        return buildDenied("AD_ACCOUNT_REQUIRED", "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u044B\u0431\u0440\u0430\u0442\u044C ad account \u043F\u0435\u0440\u0435\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435\u043C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F.");
      }
      if (action.riskLevel === "high" && !policy.allowHighRiskActions) {
        return buildDenied("HIGH_RISK_BLOCKED", "\u0412\u044B\u0441\u043E\u043A\u043E\u0440\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u043E\u0439 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438.");
      }
      return {
        allowed: true,
        reasonCode: "ALLOWED",
        reason: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u043E\u0439."
      };
    }
  };
  var summarizePolicy = (policy = basePolicy) => ({
    phase3ActionsEnabled: Boolean(policy.phase3ActionsEnabled),
    allowHighRiskActions: Boolean(policy.allowHighRiskActions),
    allowlistSize: Array.isArray(policy.allowedActionIds) ? policy.allowedActionIds.length : 0
  });

  // src/FBInspector/core/actions/audit.js
  var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
  var summarizeContext = (context = {}) => ({
    selectedAdAccountId: context.selectedAdAccountId || null,
    selectedBusinessId: context.selectedBusinessId || null
  });
  var actionAudit = {
    createEntry({ stage, actionId, status, context = {}, details = {} }) {
      return {
        ts: nowIso(),
        stage,
        actionId,
        status,
        context: summarizeContext(context),
        details
      };
    }
  };

  // src/FBInspector/core/actions/pipeline.js
  var actionPipeline = {
    async run({ actionId, context = {}, policy, logger: logger2, execute }) {
      const startedAt = Date.now();
      const action = actionsRegistry.getById(actionId);
      logger2(actionAudit.createEntry({
        stage: "resolve",
        actionId,
        status: action ? "ok" : "error",
        context,
        details: { found: Boolean(action) }
      }));
      const decision = actionPolicy.evaluate(action, context, policy);
      logger2(actionAudit.createEntry({
        stage: "policy",
        actionId,
        status: decision.allowed ? "ok" : "blocked",
        context,
        details: decision
      }));
      if (!decision.allowed) {
        return {
          ok: false,
          stage: "policy",
          reasonCode: decision.reasonCode,
          reason: decision.reason
        };
      }
      const precheck = {
        enabled: Boolean(action?.enabled),
        reason: action?.enabled ? "Action \u043F\u043E\u043C\u0435\u0447\u0435\u043D \u043A\u0430\u043A enabled." : "Action \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D \u0432 registry."
      };
      logger2(actionAudit.createEntry({
        stage: "precheck",
        actionId,
        status: precheck.enabled ? "ok" : "blocked",
        context,
        details: precheck
      }));
      if (!precheck.enabled) {
        return {
          ok: false,
          stage: "precheck",
          reasonCode: "ACTION_DISABLED",
          reason: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u0432 registry."
        };
      }
      const confirmResult = {
        required: Boolean(action?.destructive),
        confirmed: !action?.destructive,
        mode: action?.destructive ? "manual_required" : "auto_confirm_read_only"
      };
      logger2(actionAudit.createEntry({
        stage: "confirm",
        actionId,
        status: confirmResult.confirmed ? "ok" : "blocked",
        context,
        details: confirmResult
      }));
      if (!confirmResult.confirmed) {
        return {
          ok: false,
          stage: "confirm",
          reasonCode: "CONFIRMATION_REQUIRED",
          reason: "\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u044F\u0432\u043D\u043E\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435."
        };
      }
      let executionResult = null;
      try {
        if (typeof execute === "function") {
          executionResult = await execute(action, context);
        } else {
          executionResult = {
            mode: "dry_run",
            message: "Execution handler \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D. \u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D dry-run."
          };
        }
      } catch (error) {
        logger2(actionAudit.createEntry({
          stage: "execution",
          actionId,
          status: "error",
          context,
          details: {
            message: error?.message || "\u041E\u0448\u0438\u0431\u043A\u0430 execution handler",
            raw: error
          }
        }));
        return {
          ok: false,
          stage: "execution",
          reasonCode: "EXECUTION_ERROR",
          reason: error?.message || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F"
        };
      }
      logger2(actionAudit.createEntry({
        stage: "execution",
        actionId,
        status: "ok",
        context,
        details: executionResult
      }));
      return {
        ok: true,
        stage: "execution",
        message: "Pipeline \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D \u0443\u0441\u043F\u0435\u0448\u043D\u043E.",
        durationMs: Math.max(0, Date.now() - startedAt),
        result: executionResult
      };
    }
  };

  // src/FBInspector/core/actions/executors.js
  var createActionExecutors = ({ modules, accessToken, context, logDebug }) => {
    const {
      accountsModule: accountsModule2,
      billingModule: billingModule2,
      businessesModule: businessesModule2,
      pagesModule: pagesModule2,
      diagnosticsModule: diagnosticsModule2
    } = modules;
    return {
      "accounts.load_snapshot": async () => accountsModule2.load({ accessToken }),
      "billing.load_snapshot": async () => billingModule2.load({ accessToken, context, logDebug }),
      "businesses.load_snapshot": async () => businessesModule2.load({ accessToken }),
      "pages.load_snapshot": async () => pagesModule2.load({ accessToken }),
      "diagnostics.load_snapshot": async () => diagnosticsModule2.load({ accessToken })
    };
  };
  var runActionExecutor = async ({ actionId, executors = {} }) => {
    const executeHandler = executors[actionId];
    if (typeof executeHandler !== "function") {
      return {
        ok: false,
        rows: [],
        warnings: ["\u0414\u043B\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 execution handler."]
      };
    }
    const rows = await executeHandler();
    return {
      ok: true,
      rows: Array.isArray(rows) ? rows : []
    };
  };

  // src/FBInspector/index.js
  var phase2Modules = [
    accountsModule,
    businessesModule,
    pagesModule,
    billingModule,
    adsModule,
    diagnosticsModule
  ];
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
  var buildActionResult = ({ mode = "read_only", rows = [], warnings = [], message = "", startedAt = 0 }) => ({
    mode,
    loadedItems: Array.isArray(rows) ? rows.length : 0,
    durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : 0,
    warnings,
    message
  });
  var selectStartupActionId = (context = {}, enabledActions = []) => {
    if (!Array.isArray(enabledActions) || !enabledActions.length) {
      return null;
    }
    if (context.selectedAdAccountId && enabledActions.some((action) => action.id === "billing.load_snapshot")) {
      return "billing.load_snapshot";
    }
    if (enabledActions.some((action) => action.id === "accounts.load_snapshot")) {
      return "accounts.load_snapshot";
    }
    return enabledActions[0].id;
  };
  var getActionMetadata = (action) => ({
    id: action.id,
    module: action.module,
    enabled: action.enabled,
    requiresAdAccount: action.requiresAdAccount,
    destructive: action.destructive,
    riskLevel: action.riskLevel
  });
  var createInstance = () => {
    const style = mountStyles();
    const root = mountRoot();
    const token = authService.getAccessToken();
    const initialAdAccountId = authService.getCurrentAdAccountId();
    const loadModule = async (shell2, moduleId) => {
      const selectedModule = phase2Modules.find((item) => item.id === moduleId);
      if (!selectedModule) {
        shell2.appendLog(logger.warning(`\u041C\u043E\u0434\u0443\u043B\u044C ${moduleId} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`));
        return;
      }
      if (!token) {
        shell2.appendLog(logger.error("\u0422\u043E\u043A\u0435\u043D \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043F\u0442 \u0432 Ads Manager."));
        shell2.renderRows([]);
        return;
      }
      const context = shell2.getContext();
      shell2.appendLog(logger.info(`\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0438: ${selectedModule.title}`));
      shell2.appendLog(logger.info(`\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442: adAccount=${context.selectedAdAccountId || "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D"}, business=${context.selectedBusinessId || "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D"}`));
      if (selectedModule.requiresAccountContext && !context.selectedAdAccountId) {
        shell2.appendLog(logger.warning("\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u044B\u0431\u0440\u0430\u0442\u044C ad account \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u044D\u0442\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0438."));
        shell2.renderRows([]);
        return;
      }
      const logDebug = (message, meta = {}) => {
        shell2.appendLog(logger.info(`${message}: ${JSON.stringify(meta)}`));
      };
      try {
        const rows = await selectedModule.load({ accessToken: token, context, logDebug });
        shell2.renderRows(rows);
        if (!rows.length) {
          shell2.appendLog(logger.warning("\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B, API \u0432\u0435\u0440\u043D\u0443\u043B \u043F\u0443\u0441\u0442\u043E\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0431\u0435\u0437 \u043E\u0448\u0438\u0431\u043A\u0438"));
        } else {
          shell2.appendLog(logger.success(`\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0435\u0439: ${rows.length}`));
        }
      } catch (error) {
        const normalized = fbApi.normalizeError(error);
        shell2.appendLog(logger.error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 ${selectedModule.title}: ${normalized.message}`));
        shell2.appendLog(logger.error(`\u041E\u0431\u044A\u0435\u043A\u0442 \u043E\u0448\u0438\u0431\u043A\u0438: ${JSON.stringify(normalized.raw || error)}`));
        shell2.renderRows([]);
      }
    };
    const shell = createShell({
      root,
      tabs: phase2Modules,
      initialContext: {
        selectedAdAccountId: initialAdAccountId ? String(initialAdAccountId).replace(/^act_/, "") : "",
        selectedBusinessId: ""
      },
      onSelect: (moduleId) => {
        loadModule(shell, moduleId);
      }
    });
    shell.appendLog(logger.info("Shell \u0441\u043C\u043E\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D"));
    const phase3Policy = {
      phase3ActionsEnabled: false,
      allowHighRiskActions: false,
      allowedActionIds: [
        "accounts.load_snapshot",
        "billing.load_snapshot",
        "businesses.load_snapshot",
        "pages.load_snapshot",
        "diagnostics.load_snapshot"
      ]
    };
    const registeredActions = actionsRegistry.list();
    const enabledActions = actionsRegistry.listEnabled();
    const readonlyEnabledActions = actionsRegistry.listReadonlyEnabled();
    const summaryByModule = actionsRegistry.summarizeEnabledByModule();
    const summaryByRisk = actionsRegistry.summarizeEnabledByRisk();
    shell.appendLog(logger.info(`Phase 3 foundation: \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 ${registeredActions.length}`));
    shell.appendLog(logger.info(`Phase 3 foundation: enabled \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 ${enabledActions.length}`));
    shell.appendLog(logger.info(`Phase 3 foundation: read-only enabled \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 ${readonlyEnabledActions.length}`));
    shell.appendLog(logger.info(`Phase 3 foundation: summary by module ${JSON.stringify(summaryByModule)}`));
    shell.appendLog(logger.info(`Phase 3 foundation: summary by risk ${JSON.stringify(summaryByRisk)}`));
    shell.appendLog(logger.info(`Phase 3 foundation: policy summary ${JSON.stringify(summarizePolicy(phase3Policy))}`));
    shell.appendLog(logger.info(`Phase 3 foundation: action catalog ${JSON.stringify(enabledActions.map(getActionMetadata))}`));
    const startupContext = shell.getContext();
    const startupActionId = selectStartupActionId(startupContext, enabledActions);
    if (!phase3Policy.phase3ActionsEnabled) {
      shell.appendLog(logger.warning("Controlled actions \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E. \u0414\u043B\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 policy flag phase3ActionsEnabled."));
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
            return buildActionResult({ rows: execution.rows, message: `${actionTitle} \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D.`, startedAt });
          }
          return buildActionResult({
            mode: "dry_run",
            rows: execution.rows,
            warnings: execution.warnings,
            message: "Execution handler \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.",
            startedAt
          });
        }
      }).then((result) => {
        if (!result.ok) {
          shell.appendLog(logger.warning(`Action pipeline: ${result.reason}`));
        } else {
          shell.appendLog(logger.info(`Action pipeline duration: ${result.durationMs}ms`));
          shell.appendLog(logger.success(result.message));
        }
      });
    } else {
      shell.appendLog(logger.warning("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 enabled controlled actions \u0434\u043B\u044F startup pipeline."));
    }
    loadModule(shell, phase2Modules[0].id);
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
