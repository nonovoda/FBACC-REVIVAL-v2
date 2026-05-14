export const noop = () => {};

export const safeRemoveNode = (node) => {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
};
