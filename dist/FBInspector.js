(() => {
  // src/FBInspector/core/config.js
  var GRAPH_API_VERSION = "v25.0";
  var GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}/`;
  var FBINSPECTOR_ROOT_ID = "fbinspector-root";
  var FBINSPECTOR_STYLE_ID = "fbinspector-styles";
  var FBINSPECTOR_INSTANCE_KEY = "__FBINSPECTOR_INSTANCE__";

  // src/FBInspector/core/logger.js
  var logger = {
    info: (...args) => console.info("[FBInspector]", ...args),
    success: (...args) => console.log("[FBInspector]", ...args),
    warning: (...args) => console.warn("[FBInspector]", ...args),
    error: (...args) => console.error("[FBInspector]", ...args)
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
    container.textContent = "FBInspector: foundation initialized";
    root.appendChild(container);
    return {
      destroy: () => {
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
  var createInstance = () => {
    const style = mountStyles();
    const root = mountRoot();
    const shell = createShell({ root });
    return {
      destroy() {
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
    logger.info("\u0418\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    return instance;
  };
  launch();
})();
