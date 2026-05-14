const basePolicy = {
  phase3ActionsEnabled: false,
  allowHighRiskActions: false
};

const buildDenied = (reasonCode, reason) => ({
  allowed: false,
  reasonCode,
  reason
});

export const actionPolicy = {
  evaluate(action, context = {}, policy = basePolicy) {
    if (!action) {
      return buildDenied('ACTION_NOT_FOUND', 'Действие не найдено в реестре.');
    }

    if (!policy.phase3ActionsEnabled) {
      return buildDenied('PHASE3_ACTIONS_DISABLED', 'Phase 3 actions отключены политикой безопасности.');
    }

    if (action.requiresAdAccount && !context.selectedAdAccountId) {
      return buildDenied('AD_ACCOUNT_REQUIRED', 'Требуется выбрать ad account перед выполнением действия.');
    }

    if (action.riskLevel === 'high' && !policy.allowHighRiskActions) {
      return buildDenied('HIGH_RISK_BLOCKED', 'Высокорисковые действия отключены политикой безопасности.');
    }

    return {
      allowed: true,
      reasonCode: 'ALLOWED',
      reason: 'Действие разрешено политикой.'
    };
  }
};
