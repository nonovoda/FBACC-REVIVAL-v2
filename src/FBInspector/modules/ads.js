import { fbApi } from '../core/api.js';

const normalizeAdsRows = (items = []) => items.map((item) => ({
  id: item.id ?? null,
  name: item.name ?? 'Без названия',
  status: item.status ?? null,
  effective_status: item.effective_status ?? null,
  campaign_id: item.campaign_id ?? null,
  adset_id: item.adset_id ?? null,
  creative_id: item.creative?.id ?? null
}));

export const adsModule = {
  id: 'ads',
  title: 'Объявления',
  requiresAccountContext: true,
  async load({ accessToken, context = {}, logDebug }) {
    const adAccountId = context.selectedAdAccountId;
    if (!adAccountId) {
      throw {
        code: 'ADS_ACCOUNT_CONTEXT_REQUIRED',
        message: 'Для вкладки «Объявления» выберите ad account в поле контекста.'
      };
    }

    const endpoint = `act_${adAccountId}/ads`;
    const params = {
      fields: 'id,name,status,effective_status,campaign_id,adset_id,creative{id}',
      limit: 100
    };

    logDebug('Ads: подготовка запроса', { endpoint, params, context });

    const payload = await fbApi.get(endpoint, params, { accessToken, retries: 1 });
    const rawItems = Array.isArray(payload?.data) ? payload.data : [];
    const normalizedItems = normalizeAdsRows(rawItems);

    logDebug('Ads: сводка ответа API', {
      endpoint,
      rawSummary: {
        hasDataArray: Array.isArray(payload?.data),
        dataLength: rawItems.length,
        pagingNext: Boolean(payload?.paging?.next)
      },
      itemsBeforeNormalize: rawItems.length,
      itemsAfterNormalize: normalizedItems.length
    });

    return normalizedItems;
  }
};
