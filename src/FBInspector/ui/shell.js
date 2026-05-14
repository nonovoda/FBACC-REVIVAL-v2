export const createShell = ({ root }) => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="background:#0f1715;border:1px solid #2b433a;border-radius:14px;padding:14px;min-width:320px;max-width:420px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#4dff8f;line-height:1.05;">FBInspector</div>
          <div style="font-size:11px;color:#99b3a6;">Phase 1 Foundation</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:12px;color:#c7e0d2;">Лог инициализации</div>
      <pre data-role="log" style="margin-top:6px;background:#0b1210;border:1px solid #22372f;border-radius:10px;padding:8px;min-height:120px;max-height:220px;overflow:auto;font-size:12px;color:#e8fff0;"></pre>
    </div>
  `;

  root.appendChild(container);
  const logEl = container.querySelector('[data-role="log"]');

  return {
    appendLog(entry) {
      const line = `[${entry.ts}] [${entry.level}] ${entry.message}`;
      logEl.textContent += `${line}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    },
    destroy() {
      if (container.parentNode === root) {
        root.removeChild(container);
      }
    }
  };
};
