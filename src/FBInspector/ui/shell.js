export const createShell = ({ root }) => {
  const container = document.createElement('div');
  container.textContent = 'FBInspector: foundation initialized';
  root.appendChild(container);

  return {
    destroy: () => {
      if (container.parentNode === root) {
        root.removeChild(container);
      }
    }
  };
};
