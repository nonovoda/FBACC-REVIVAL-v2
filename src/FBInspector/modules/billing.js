import { fbApi } from '../core/api.js';

const normalizeFundingSource = (item = {}) => ({
  id: item.id ?? null,
  type: item.type ?? null,
  display_string: item.display_string ?? null,
  is_verified: item.is_verified ?? null,
  billing_status: item.billing_status ?? null
});

export const billingModule = {
  id: 'billing',
  title: 'Биллинг',
  requiresAccountContext: true,
  async load({ accessToken, context = {}, logDebug }) {
    const adAccountId = context.selectedAdAccountId;
    if (!adAccountId) {
      throw {
        code: 'BILLING_ACCOUNT_CONTEXT_REQUIRED',
        message: 'Для вкладки «Биллинг» выберите ad account в поле контекста.'
      };
    }

    const endpoint = `act_${adAccountId}`;
    const params = {
      fields: 'id,name,account_status,funding_source_details{type,display_string,is_verified,billing_status},amount_spent,balance,currency'
    };

    logDebug('Billing: подготовка запроса', { endpoint, params, context });

    const payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
    const rawFunding = payload?.funding_source_details;
    const rawItems = Array.isArray(rawFunding) ? rawFunding : (rawFunding ? [rawFunding] : []);
    const normalizedItems = rawItems.map((item) => normalizeFundingSource(item));

    logDebug('Billing: сводка ответа API', {
      endpoint,
      rawSummary: {
        accountId: payload?.id ?? null,
        accountName: payload?.name ?? null,
        hasFundingSourceDetails: Boolean(rawFunding),
        fundingSourceType: Array.isArray(rawFunding) ? 'array' : typeof rawFunding
      },
      itemsBeforeNormalize: rawItems.length,
      itemsAfterNormalize: normalizedItems.length
    });

    if (!normalizedItems.length) {
      return [{
        account_id: payload?.id ?? null,
        account_name: payload?.name ?? null,
        billing_status: payload?.account_status ?? null,
        amount_spent: payload?.amount_spent ?? null,
        balance: payload?.balance ?? null,
        currency: payload?.currency ?? null
      }];
    }

    return normalizedItems;
  }
};
