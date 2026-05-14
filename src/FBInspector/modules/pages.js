import { fbApi } from '../core/api.js';

export const pagesModule = {
  id: 'pages',
  title: 'Страницы',
  async load({ accessToken }) {
    const data = await fbApi.get('me/accounts', {
      fields: 'id,name,category',
      limit: 50
    }, { accessToken, retries: 1 });
    return data.data || [];
  }
};
