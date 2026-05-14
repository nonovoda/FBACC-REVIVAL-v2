export const ACTION_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const registry = [
  {
    id: 'accounts.load_snapshot',
    title: 'Загрузить snapshot аккаунтов',
    module: 'accounts',
    requiresAdAccount: false,
    destructive: false,
    enabled: true,
    riskLevel: ACTION_RISK_LEVELS.LOW
  },
  {
    id: 'ads.refresh_snapshot',
    title: 'Обновить snapshot объявлений',
    module: 'ads',
    requiresAdAccount: true,
    destructive: false,
    enabled: false,
    riskLevel: ACTION_RISK_LEVELS.LOW
  },
  {
    id: 'billing.refresh_snapshot',
    title: 'Обновить snapshot биллинга',
    module: 'billing',
    requiresAdAccount: true,
    destructive: false,
    enabled: false,
    riskLevel: ACTION_RISK_LEVELS.LOW
  },
  {
    id: 'billing.load_snapshot',
    title: 'Загрузить snapshot биллинга',
    module: 'billing',
    requiresAdAccount: true,
    destructive: false,
    enabled: true,
    riskLevel: ACTION_RISK_LEVELS.LOW
  },
  {
    id: 'businesses.load_snapshot',
    title: 'Загрузить snapshot бизнесов',
    module: 'businesses',
    requiresAdAccount: false,
    destructive: false,
    enabled: true,
    riskLevel: ACTION_RISK_LEVELS.LOW
  },
  {
    id: 'pages.load_snapshot',
    title: 'Загрузить snapshot страниц',
    module: 'pages',
    requiresAdAccount: false,
    destructive: false,
    enabled: true,
    riskLevel: ACTION_RISK_LEVELS.LOW
  }
];

export const actionsRegistry = {
  list() {
    return registry.map((action) => ({ ...action }));
  },
  getById(actionId) {
    return registry.find((action) => action.id === actionId) ?? null;
  }
};
