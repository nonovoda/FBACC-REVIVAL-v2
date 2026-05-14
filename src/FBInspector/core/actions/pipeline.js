import { actionsRegistry } from './registry.js';
import { actionPolicy } from './policy.js';
import { actionAudit } from './audit.js';

export const actionPipeline = {
  async run({ actionId, context = {}, policy, logger }) {
    const action = actionsRegistry.getById(actionId);
    logger(actionAudit.createEntry({
      stage: 'resolve',
      actionId,
      status: action ? 'ok' : 'error',
      context,
      details: { found: Boolean(action) }
    }));

    const decision = actionPolicy.evaluate(action, context, policy);
    logger(actionAudit.createEntry({
      stage: 'policy',
      actionId,
      status: decision.allowed ? 'ok' : 'blocked',
      context,
      details: decision
    }));

    if (!decision.allowed) {
      return {
        ok: false,
        stage: 'policy',
        reasonCode: decision.reasonCode,
        reason: decision.reason
      };
    }

    logger(actionAudit.createEntry({
      stage: 'dry_run',
      actionId,
      status: 'ok',
      context,
      details: {
        message: 'Dry-run завершён. Реальное выполнение отключено в Phase 3 foundation.'
      }
    }));

    return {
      ok: true,
      stage: 'dry_run',
      message: 'Pipeline готов. Реальное выполнение бизнес-actions не включено.'
    };
  }
};
