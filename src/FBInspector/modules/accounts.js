import { fbApi } from '../core/api.js';

export const accountsModule = {
  id: 'accounts',
  title: 'Аккаунты',
  async load({ accessToken }) {
    const data = await fbApi.get('me/adaccounts', {
      fields: 'id,name,account_status,currency,timezone_name,business',
      limit: 50
    }, { accessToken, retries: 1 });
    return data.data || [];
  }
};
