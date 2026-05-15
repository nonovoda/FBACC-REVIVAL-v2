export const createTabs = ({ root, tabs, onSelect, initialActiveTabId }) => {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '6px';
  wrapper.style.marginTop = '10px';
  wrapper.style.marginBottom = '10px';

  const buttons = new Map();

  const setActiveTab = (id) => {
    buttons.forEach((button, tabId) => {
      button.style.borderColor = tabId === id ? '#4dff8f' : '#2f4a40';
      button.style.color = tabId === id ? '#4dff8f' : '#c7e0d2';
    });
  };

  let defaultActiveId = tabs[0]?.id ?? null;

  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tab.title;
    button.style.background = '#121f1b';
    button.style.border = '1px solid #2f4a40';
    button.style.borderRadius = '8px';
    button.style.padding = '6px 8px';
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.onclick = () => {
      setActiveTab(tab.id);
      onSelect(tab.id);
    };

    buttons.set(tab.id, button);
    wrapper.appendChild(button);

    if (!defaultActiveId) {
      defaultActiveId = tab.id;
    }
  });

  const initialTabId = tabs.some((tab) => tab.id === initialActiveTabId) ? initialActiveTabId : defaultActiveId;
  if (initialTabId) {
    setActiveTab(initialTabId);
  }

  root.appendChild(wrapper);
  return { destroy: () => root.removeChild(wrapper), setActiveTab, initialTabId };
};
