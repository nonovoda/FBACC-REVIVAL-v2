const nowIso = () => new Date().toISOString();

const summarizeContext = (context = {}) => ({
  selectedAdAccountId: context.selectedAdAccountId || null,
  selectedBusinessId: context.selectedBusinessId || null
});

export const actionAudit = {
  createEntry({ stage, actionId, status, context = {}, details = {} }) {
    return {
      ts: nowIso(),
      stage,
      actionId,
      status,
      context: summarizeContext(context),
      details
    };
  }
};
