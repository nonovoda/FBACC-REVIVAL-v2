import { fbApi } from '../core/api.js';

export const diagnosticsModule = {
  id: 'diagnostics',
  title: 'Диагностика',
  async load({ accessToken }) {
    const me = await fbApi.get('me', { fields: 'id,name' }, { accessToken, retries: 1 });
    return [me];
  }
};
