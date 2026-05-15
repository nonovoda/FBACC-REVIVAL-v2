import { actionsRegistry } from './registry.js';
import { actionPolicy } from './policy.js';
import { actionAudit } from './audit.js';

export const actionPipeline = {
  async run({ actionId, context = {}, policy, logger, execute }) {
    const startedAt = Date.now();
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

    const precheck = {
      enabled: Boolean(action?.enabled),
      reason: action?.enabled ? 'Action помечен как enabled.' : 'Action отключён в registry.'
    };
    logger(actionAudit.createEntry({
      stage: 'precheck',
      actionId,
      status: precheck.enabled ? 'ok' : 'blocked',
      context,
      details: precheck
    }));

    if (!precheck.enabled) {
      return {
        ok: false,
        stage: 'precheck',
        reasonCode: 'ACTION_DISABLED',
        reason: 'Действие отключено в registry.'
      };
    }

    const confirmResult = {
      required: Boolean(action?.destructive),
      confirmed: !action?.destructive,
      mode: action?.destructive ? 'manual_required' : 'auto_confirm_read_only'
    };

    logger(actionAudit.createEntry({
      stage: 'confirm',
      actionId,
      status: confirmResult.confirmed ? 'ok' : 'blocked',
      context,
      details: confirmResult
    }));

    if (!confirmResult.confirmed) {
      return {
        ok: false,
        stage: 'confirm',
        reasonCode: 'CONFIRMATION_REQUIRED',
        reason: 'Для этого действия требуется явное подтверждение.'
      };
    }

    let executionResult = null;
    try {
      if (typeof execute === 'function') {
        executionResult = await execute(action, context);
      } else {
        executionResult = {
          mode: 'dry_run',
          message: 'Execution handler не передан. Выполнен dry-run.'
        };
      }
    } catch (error) {
      logger(actionAudit.createEntry({
        stage: 'execution',
        actionId,
        status: 'error',
        context,
        details: {
          message: error?.message || 'Ошибка execution handler',
          raw: error
        }
      }));

      return {
        ok: false,
        stage: 'execution',
        reasonCode: 'EXECUTION_ERROR',
        reason: error?.message || 'Ошибка выполнения действия'
      };
    }

    logger(actionAudit.createEntry({
      stage: 'execution',
      actionId,
      status: 'ok',
      context,
      details: executionResult
    }));

    return {
      ok: true,
      stage: 'execution',
      message: 'Pipeline завершён успешно.',
      durationMs: Math.max(0, Date.now() - startedAt),
      result: executionResult
    };
  }
};
