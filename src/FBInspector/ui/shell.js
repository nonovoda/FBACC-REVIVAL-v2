import { createTabs } from './tabs.js';
import { createTable } from './table.js';

export const createShell = ({ root, tabs, onSelect }) => {
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
      <div data-role="table"></div>
      <div style="margin-top:10px;font-size:12px;color:#c7e0d2;">Лог инициализации</div>
      <pre data-role="log" style="margin-top:6px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;min-height:100px;max-height:180px;overflow:auto;font-size:12px;color:#e8fff0;"></pre>
    </div>
  `;

  root.appendChild(container);
  const logEl = container.querySelector('[data-role="log"]');
  const tabsRoot = container.querySelector('[data-role="tabs"]');
  const tableRoot = container.querySelector('[data-role="table"]');

  const tabsUi = createTabs({ root: tabsRoot, tabs, onSelect });
  const tableUi = createTable({ root: tableRoot });

  return {
    appendLog(entry) {
      const line = `[${entry.ts}] [${entry.level}] ${entry.message}`;
      logEl.textContent += `${line}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    },
    renderRows(rows) {
      tableUi.render(rows);
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
