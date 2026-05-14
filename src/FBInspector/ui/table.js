export const createTable = ({ root }) => {
  const pre = document.createElement('pre');
  pre.style.marginTop = '8px';
  pre.style.background = '#0b1210';
  pre.style.border = '1px solid #22372f';
  pre.style.borderRadius = '10px';
  pre.style.padding = '8px';
  pre.style.minHeight = '120px';
  pre.style.maxHeight = '240px';
  pre.style.overflow = 'auto';
  pre.style.fontSize = '12px';
  pre.style.color = '#e8fff0';

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
