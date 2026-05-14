export const ACTION_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const registry = [
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
