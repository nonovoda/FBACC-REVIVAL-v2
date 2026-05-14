import { fbApi } from '../core/api.js';

export const businessesModule = {
  id: 'businesses',
  title: 'Бизнесы',
  async load({ accessToken }) {
    const data = await fbApi.get('me/businesses', {
      fields: 'id,name,verification_status',
      limit: 50
    }, { accessToken, retries: 1 });
    return data.data || [];
  }
};
