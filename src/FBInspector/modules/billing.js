import { fbApi } from '../core/api.js';

const normalizeFundingSource = (item = {}) => ({
  id: item.id ?? null,
  type: item.type ?? null,
  display_string: item.display_string ?? null,
  billing_status: item.billing_status ?? null
});

const extractMissingFieldFromError = (error) => {
  const message = error?.message || '';
  const match = message.match(/nonexisting field \(([^)]+)\)/i);
  return match?.[1] ?? null;
};

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
    const baseFields = 'id,name,account_status,amount_spent,balance,currency';
    const requestedFundingFields = ['type', 'display_string', 'billing_status'];
    let activeFundingFields = [...requestedFundingFields];

    const createParams = () => ({
      fields: `${baseFields},funding_source_details{${activeFundingFields.join(',')}}`
    });

    let params = createParams();

    logDebug('Billing: подготовка запроса', { endpoint, params, context });

    let payload;
    try {
      payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
    } catch (error) {
      const missingField = extractMissingFieldFromError(error);
      if (error?.code === 100 && missingField && activeFundingFields.includes(missingField)) {
        activeFundingFields = activeFundingFields.filter((field) => field !== missingField);
        params = createParams();
        logDebug('Billing: предупреждение', {
          message: 'Часть полей billing недоступна, выполняю повторный запрос без проблемного поля',
          unavailableFields: [missingField],
          errorObject: error,
          retryParams: params
        });
        payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
      } else {
        throw error;
      }
    }

    const rawFunding = payload?.funding_source_details;
    const rawItems = Array.isArray(rawFunding) ? rawFunding : (rawFunding ? [rawFunding] : []);
    const normalizedItems = rawItems.map((item) => normalizeFundingSource(item));

    logDebug('Billing: сводка ответа API', {
      endpoint,
      rawSummary: {
        accountId: payload?.id ?? null,
        accountName: payload?.name ?? null,
        hasFundingSourceDetails: Boolean(rawFunding),
        fundingSourceType: Array.isArray(rawFunding) ? 'array' : typeof rawFunding,
        requestedFundingFields,
        activeFundingFields,
        unavailableFundingFields: requestedFundingFields.filter((field) => !activeFundingFields.includes(field))
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
