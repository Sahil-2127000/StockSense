import { api, data } from './api.js';

export const productsService = {
  list: (query) => api.get('/products', query),
  get: (id) => data(api.get(`/products/${id}`)),
  create: (body) => data(api.post('/products', body)),
  update: (id, body) => data(api.patch(`/products/${id}`, body)),
  remove: (id) => data(api.delete(`/products/${id}`)),
  setReorderRule: (id, rule) => data(api.put(`/products/${id}/reorder-rule`, rule)),
  removeReorderRule: (id) => data(api.delete(`/products/${id}/reorder-rule`)),
};
