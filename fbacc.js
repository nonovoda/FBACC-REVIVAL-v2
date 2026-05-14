javascript:(() => {
  const TOOL_ID = 'fb-account-inspector';
  const STYLE_ID = 'fb-account-inspector-style';
  const OVERLAY_ID = `${TOOL_ID}-overlay`;

  const STATUS = {
    ACTIVE: 'ACTIVE',
    DISABLED: 'DISABLED',
    UNKNOWN: 'UNKNOWN'
  };

  const state = {
    accounts: [],
    filtered: [],
    selectedAccountId: null,
    filters: {
      search: '',
      status: 'ALL',
      bmId: 'ALL',
      sortBy: 'name'
    }
  };

  const ui = {};

  function destroy() {
    document.getElementById(TOOL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function safeText(value) {
    return value == null || value === '' ? '—' : String(value);
  }

  function now() {
    return new Date().toLocaleTimeString('ru-RU', { hour12: false });
  }

  function log(message, type = 'info') {
    if (!ui.logs) return;
    const row = document.createElement('div');
    row.className = type === 'info' ? 'fbai-log__line' : `fbai-log__line is-${type}`;
    row.textContent = `[${now()}] ${message}`;
    ui.logs.appendChild(row);
    ui.logs.scrollTop = ui.logs.scrollHeight;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
:root{--bg:#0f1715;--bg-soft:#121f1b;--bg-deep:#0b1210;--border:#294238;--text:#e8fff0;--muted:#99b3a6;--accent:#4dff8f;--danger:#ff8f8f;--warning:#ffd27d}
#${OVERLAY_ID}{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:2147483646}
#${TOOL_ID}{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;width:min(1040px,calc(100vw - 24px));max-height:calc(100vh - 28px);overflow:auto;background:var(--bg);border:1px solid var(--border);border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.45);color:var(--text);font:13px/1.4 Inter,"Segoe UI",Arial,sans-serif;padding:14px}
.fbai-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.fbai-title{margin:0;color:var(--accent);font-size:24px;font-weight:800}
.fbai-meta{font-size:12px;color:var(--muted)}
.fbai-close{border:0;background:transparent;color:var(--text);font-size:24px;cursor:pointer}
.fbai-toolbar{display:grid;grid-template-columns:1.2fr .8fr .8fr .8fr auto;gap:8px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft)}
.fbai-input,.fbai-select,.fbai-button{background:var(--bg-deep);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px;font:inherit}
.fbai-button{cursor:pointer;font-weight:700}
.fbai-button.is-primary{background:var(--accent);color:#032112;border-color:var(--accent)}
.fbai-layout{display:grid;grid-template-columns:1.35fr .95fr;gap:10px;margin-top:10px}
.fbai-card{border:1px solid var(--border);background:var(--bg-soft);border-radius:10px;padding:10px}
.fbai-card h3{margin:0 0 8px;font-size:13px;color:#bde7ce;text-transform:uppercase;letter-spacing:.06em}
.fbai-table{width:100%;border-collapse:collapse;font-size:12px}
.fbai-table th,.fbai-table td{padding:7px 6px;border-bottom:1px solid #21352e;vertical-align:top}
.fbai-table th{text-align:left;color:#b9d5c7;font-size:11px}
.fbai-row{cursor:pointer}
.fbai-row.is-active{background:#1a2c25}
.fbai-status{display:inline-block;padding:2px 7px;border-radius:999px;font-size:11px;border:1px solid var(--border)}
.fbai-status.is-active{color:#92ffb8}.fbai-status.is-disabled{color:var(--danger)}
.fbai-actions{display:flex;gap:5px;flex-wrap:wrap}
.fbai-actions button{font-size:11px;padding:4px 6px}
.fbai-kv{display:grid;grid-template-columns:160px 1fr;gap:6px 8px;font-size:12px}
.fbai-kv b{color:#c5dfd2}
.fbai-list{margin:0;padding-left:17px;font-size:12px}
.fbai-logs{margin-top:10px;max-height:150px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:var(--bg-deep);padding:8px;font-family:ui-monospace,Menlo,monospace;font-size:12px}
.fbai-log__line.is-success{color:#89fca5}.fbai-log__line.is-warning{color:var(--warning)}.fbai-log__line.is-error{color:var(--danger)}
`;
    document.head.appendChild(style);
  }

  function parseAccountIdFromUrl() {
    const url = new URL(location.href);
    const raw = url.searchParams.get('act') || (location.pathname.match(/act=(\d+)/)?.[1] || '');
    return raw.replace(/^act_?/, '');
  }

  function buildFallbackAccount() {
    const id = parseAccountIdFromUrl() || 'unknown';
    const bmId = new URL(location.href).searchParams.get('business_id') || 'unknown';
    return [{
      id,
      name: id === 'unknown' ? 'Current Context Account' : `Ad Account ${id}`,
      status: document.body.textContent.includes('disabled') ? STATUS.DISABLED : STATUS.UNKNOWN,
      currency: '—',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
      spendLimit: '—',
      balance: '—',
      bm: { id: bmId, name: bmId === 'unknown' ? 'Not detected' : `Business ${bmId}`, status: 'UNKNOWN' },
      pages: [],
      ownership: bmId === 'unknown' ? 'Personal' : 'Business',
      diagnostics: ['Live DOM snapshot mode', 'Graph data not available in this context']
    }];
  }

  async function loadAccounts() {
    log('Загрузка данных аккаунтов...', 'warning');
    await new Promise((resolve) => setTimeout(resolve, 220));
    const data = buildFallbackAccount();
    state.accounts = data;
    state.selectedAccountId = data[0]?.id || null;
    log(`Загружено аккаунтов: ${data.length}`, 'success');
  }

  function getBmOptions() {
    const map = new Map();
    state.accounts.forEach((acc) => {
      if (acc.bm?.id) map.set(acc.bm.id, acc.bm.name || acc.bm.id);
    });
    return [...map.entries()];
  }

  function applyFilters() {
    const search = state.filters.search.trim().toLowerCase();
    state.filtered = state.accounts
      .filter((acc) => {
        if (state.filters.status !== 'ALL' && acc.status !== state.filters.status) return false;
        if (state.filters.bmId !== 'ALL' && (acc.bm?.id || '') !== state.filters.bmId) return false;
        if (!search) return true;
        return [acc.name, acc.id, acc.bm?.name, acc.bm?.id].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => {
        switch (state.filters.sortBy) {
          case 'status': return a.status.localeCompare(b.status);
          case 'bm': return safeText(a.bm?.name).localeCompare(safeText(b.bm?.name));
          case 'id': return a.id.localeCompare(b.id);
          default: return a.name.localeCompare(b.name);
        }
      });
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(String(text));
      log(`Скопировано: ${label}`, 'success');
    } catch {
      log(`Не удалось скопировать: ${label}`, 'error');
    }
  }

  function openLink(url, label) {
    window.open(url, '_blank', 'noopener,noreferrer');
    log(`Открыт раздел: ${label}`, 'info');
  }

  function renderTable() {
    const rows = state.filtered.map((acc) => {
      const statusClass = acc.status === STATUS.ACTIVE ? 'is-active' : acc.status === STATUS.DISABLED ? 'is-disabled' : '';
      const selectedClass = acc.id === state.selectedAccountId ? 'is-active' : '';
      return `<tr class="fbai-row ${selectedClass}" data-row-id="${acc.id}">
        <td>${safeText(acc.name)}</td>
        <td>${safeText(acc.id)}</td>
        <td><span class="fbai-status ${statusClass}">${safeText(acc.status)}</span></td>
        <td>${safeText(acc.bm?.name)}</td>
        <td>${safeText(acc.currency)}</td>
        <td>${safeText(acc.timezone)}</td>
        <td>
          <div class="fbai-actions">
            <button class="fbai-button" data-act="copy-id" data-id="${acc.id}">Copy ID</button>
            <button class="fbai-button" data-act="open-acc" data-id="${acc.id}">Open</button>
            <button class="fbai-button" data-act="open-billing" data-id="${acc.id}">Billing</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    ui.table.innerHTML = `<table class="fbai-table"><thead><tr>
      <th>Account</th><th>ID</th><th>Status</th><th>BM</th><th>Currency</th><th>Timezone</th><th>Quick actions</th>
    </tr></thead><tbody>${rows || '<tr><td colspan="7">Нет результатов по фильтрам.</td></tr>'}</tbody></table>`;

    ui.table.querySelectorAll('[data-row-id]').forEach((row) => {
      row.addEventListener('click', () => {
        state.selectedAccountId = row.getAttribute('data-row-id');
        render();
      });
    });

    ui.table.querySelectorAll('button[data-act]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const accountId = button.getAttribute('data-id');
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) return;

        const action = button.getAttribute('data-act');
        if (action === 'copy-id') copy(account.id, `Account ID ${account.id}`);
        if (action === 'open-acc') openLink(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${account.id}`, 'Account');
        if (action === 'open-billing') openLink(`https://www.facebook.com/ads/manager/billing/?act=${account.id}`, 'Billing');
      });
    });
  }

  function renderDetails() {
    const account = state.accounts.find((item) => item.id === state.selectedAccountId);
    if (!account) {
      ui.details.innerHTML = '<div class="fbai-meta">Аккаунт не выбран.</div>';
      return;
    }

    const pages = account.pages.length
      ? `<ul class="fbai-list">${account.pages.map((page) => `<li>${safeText(page.name)} (${safeText(page.id)})</li>`).join('')}</ul>`
      : '<div class="fbai-meta">Связанные страницы не обнаружены.</div>';

    ui.details.innerHTML = `
      <div class="fbai-kv">
        <b>Account Name</b><span>${safeText(account.name)}</span>
        <b>Account ID</b><span>${safeText(account.id)}</span>
        <b>Status</b><span>${safeText(account.status)}</span>
        <b>Ownership</b><span>${safeText(account.ownership)}</span>
        <b>BM Name</b><span>${safeText(account.bm?.name)}</span>
        <b>BM ID</b><span>${safeText(account.bm?.id)}</span>
        <b>BM Status</b><span>${safeText(account.bm?.status)}</span>
        <b>Spend limit</b><span>${safeText(account.spendLimit)}</span>
        <b>Balance</b><span>${safeText(account.balance)}</span>
      </div>
      <h3 style="margin-top:10px">Pages</h3>
      ${pages}
      <h3 style="margin-top:10px">Diagnostics</h3>
      <ul class="fbai-list">${account.diagnostics.map((item) => `<li>${safeText(item)}</li>`).join('')}</ul>
      <div class="fbai-actions" style="margin-top:10px">
        <button class="fbai-button" data-detail-act="copy-bm">Copy BM ID</button>
        <button class="fbai-button" data-detail-act="open-bm">Open BM</button>
        <button class="fbai-button" data-detail-act="open-settings">Open Settings</button>
      </div>`;

    ui.details.querySelector('[data-detail-act="copy-bm"]').addEventListener('click', () => copy(account.bm?.id || '', `BM ID ${account.bm?.id || '—'}`));
    ui.details.querySelector('[data-detail-act="open-bm"]').addEventListener('click', () => openLink(`https://business.facebook.com/settings/info?business_id=${account.bm?.id || ''}`, 'BM'));
    ui.details.querySelector('[data-detail-act="open-settings"]').addEventListener('click', () => openLink(`https://business.facebook.com/adsmanager/manage/settings/account_settings/?act=${account.id}`, 'Account Settings'));
  }

  function renderFilters() {
    const bmOptions = getBmOptions();
    ui.filterBm.innerHTML = '<option value="ALL">All BM</option>' + bmOptions.map(([id, name]) => `<option value="${id}">${safeText(name)}</option>`).join('');
    ui.filterBm.value = state.filters.bmId;
  }

  function render() {
    applyFilters();
    renderFilters();
    renderTable();
    renderDetails();
  }

  function bindToolbar() {
    ui.search.addEventListener('input', () => { state.filters.search = ui.search.value; render(); });
    ui.filterStatus.addEventListener('change', () => { state.filters.status = ui.filterStatus.value; render(); });
    ui.filterBm.addEventListener('change', () => { state.filters.bmId = ui.filterBm.value; render(); });
    ui.sortBy.addEventListener('change', () => { state.filters.sortBy = ui.sortBy.value; render(); });
    ui.refresh.addEventListener('click', async () => {
      ui.refresh.disabled = true;
      const label = ui.refresh.textContent;
      ui.refresh.textContent = 'Loading...';
      await loadAccounts();
      render();
      ui.refresh.textContent = label;
      ui.refresh.disabled = false;
    });
  }

  function mount() {
    destroy();
    injectStyle();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    const root = document.createElement('section');
    root.id = TOOL_ID;
    root.innerHTML = `
      <header class="fbai-header">
        <div>
          <h2 class="fbai-title">FB Account Inspector</h2>
          <div class="fbai-meta">Bookmarklet Tools • Read-only Internal Utility • 2026</div>
        </div>
        <button class="fbai-close" aria-label="Close">×</button>
      </header>
      <section class="fbai-toolbar">
        <input class="fbai-input" id="fbai-search" placeholder="Search: account id / name / BM">
        <select class="fbai-select" id="fbai-status"><option value="ALL">All status</option><option value="ACTIVE">ACTIVE</option><option value="DISABLED">DISABLED</option><option value="UNKNOWN">UNKNOWN</option></select>
        <select class="fbai-select" id="fbai-bm"><option value="ALL">All BM</option></select>
        <select class="fbai-select" id="fbai-sort"><option value="name">Sort: Name</option><option value="id">Sort: ID</option><option value="status">Sort: Status</option><option value="bm">Sort: BM</option></select>
        <button class="fbai-button is-primary" id="fbai-refresh">Reload</button>
      </section>
      <section class="fbai-layout">
        <article class="fbai-card"><h3>Accounts</h3><div id="fbai-table"></div></article>
        <article class="fbai-card"><h3>Details</h3><div id="fbai-details"></div></article>
      </section>
      <section class="fbai-logs" id="fbai-logs"></section>
    `;

    document.body.append(overlay, root);

    ui.search = root.querySelector('#fbai-search');
    ui.filterStatus = root.querySelector('#fbai-status');
    ui.filterBm = root.querySelector('#fbai-bm');
    ui.sortBy = root.querySelector('#fbai-sort');
    ui.refresh = root.querySelector('#fbai-refresh');
    ui.table = root.querySelector('#fbai-table');
    ui.details = root.querySelector('#fbai-details');
    ui.logs = root.querySelector('#fbai-logs');

    const close = () => destroy();
    root.querySelector('.fbai-close').addEventListener('click', close);
    overlay.addEventListener('click', close);
    bindToolbar();
  }

  async function init() {
    mount();
    log('Инициализация FB Account Inspector...', 'warning');
    await loadAccounts();
    render();
    log('Готово. Режим безопасного чтения активен.', 'success');
  }

  init();
})();
