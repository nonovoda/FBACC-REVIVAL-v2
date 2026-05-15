import { createTabs } from './tabs.js';
import { createTable } from './table.js';

export const createShell = ({ root, tabs, onSelect, initialContext = {}, initialTabId, onContextChange }) => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="background:#0f1715;border:1px solid #2b433a;border-radius:14px;padding:14px;min-width:320px;max-width:560px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#4dff8f;line-height:1.05;">FBInspector</div>
          <div style="font-size:11px;color:#99b3a6;">Phase 2 Read-only Inspector</div>
        </div>
      </div>
      <div data-role="tabs"></div>
      <div data-role="action-state" style="margin-bottom:8px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;font-size:11px;color:#c7e0d2;">Controlled Actions: ожидание инициализации...</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:#c7e0d2;">
          ID рекламного аккаунта
          <input data-role="ad-account-input" placeholder="например, 123456789" style="background:#121f1b;border:1px solid #2f4a40;border-radius:9px;padding:8px;color:#e8fff0;font-size:12px;" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:#c7e0d2;">
          ID бизнеса
          <input data-role="business-input" placeholder="необязательно" style="background:#121f1b;border:1px solid #2f4a40;border-radius:9px;padding:8px;color:#e8fff0;font-size:12px;" />
        </label>
      </div>
      <div data-role="table"></div>
      <div style="margin-top:10px;font-size:12px;color:#c7e0d2;">Лог инициализации</div>
      <pre data-role="log" style="margin-top:6px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;min-height:100px;max-height:180px;overflow:auto;font-size:12px;color:#e8fff0;"></pre>
    </div>
  `;

  root.appendChild(container);
  const logEl = container.querySelector('[data-role="log"]');
  const adAccountInput = container.querySelector('[data-role="ad-account-input"]');
  const businessInput = container.querySelector('[data-role="business-input"]');
  const actionStateEl = container.querySelector('[data-role="action-state"]');
  const tabsRoot = container.querySelector('[data-role="tabs"]');
  const tableRoot = container.querySelector('[data-role="table"]');

  const tabsUi = createTabs({ root: tabsRoot, tabs, onSelect, initialActiveTabId: initialTabId });
  const tableUi = createTable({ root: tableRoot });
  adAccountInput.value = initialContext.selectedAdAccountId || '';
  businessInput.value = initialContext.selectedBusinessId || '';

  const emitContext = () => {
    if (typeof onContextChange === 'function') {
      onContextChange({
        selectedAdAccountId: adAccountInput.value.trim(),
        selectedBusinessId: businessInput.value.trim()
      });
    }
  };

  adAccountInput.addEventListener('change', emitContext);
  businessInput.addEventListener('change', emitContext);

  return {
    appendLog(entry) {
      const line = `[${entry.ts}] [${entry.level}] ${entry.message}`;
      logEl.textContent += `${line}\n`;
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
    setActionState(text, tone = 'info') {
      actionStateEl.textContent = text;
      actionStateEl.style.color = tone === 'warning' ? '#ffd27d' : tone === 'error' ? '#ff8f8f' : '#c7e0d2';
      actionStateEl.style.borderColor = tone === 'warning' ? '#5a4620' : tone === 'error' ? '#5a2020' : '#22372f';
    },
    destroy() {
      adAccountInput.removeEventListener('change', emitContext);
      businessInput.removeEventListener('change', emitContext);
      tabsUi.destroy();
      tableUi.destroy();
      if (container.parentNode === root) {
        root.removeChild(container);
      }
    },
    initialTabId: tabsUi.initialTabId
  };
};
