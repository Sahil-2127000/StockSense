import { api, data } from './api.js';

export const reportsService = {
  dashboard: (query) => data(api.get('/dashboard', query)),
  stock: (query) => api.get('/stock', query),
  moves: (query) => api.get('/moves', query),
};
