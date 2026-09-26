import { api, data } from './api.js';

export const operationsService = {
  list: (query) => api.get('/operations', query),
  summary: (query) => data(api.get('/operations/summary', query)),
  get: (id) => data(api.get(`/operations/${id}`)),
  create: (body) => data(api.post('/operations', body)),
  update: (id, body) => data(api.patch(`/operations/${id}`, body)),
  remove: (id) => data(api.delete(`/operations/${id}`)),
  confirm: (id) => data(api.post(`/operations/${id}/confirm`)),
  checkAvailability: (id) => data(api.post(`/operations/${id}/check-availability`)),
  validate: (id) => data(api.post(`/operations/${id}/validate`)),
  cancel: (id) => data(api.post(`/operations/${id}/cancel`)),
  adjust: (body) => data(api.post('/operations/adjustments', body)),
};
