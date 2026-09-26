import { api, data } from './api.js';

// Same five calls for every master-data resource
const crud = (resource) => ({
  list: (query) => api.get(`/${resource}`, query),
  get: (id) => data(api.get(`/${resource}/${id}`)),
  create: (body) => data(api.post(`/${resource}`, body)),
  update: (id, body) => data(api.patch(`/${resource}/${id}`, body)),
  remove: (id) => data(api.delete(`/${resource}/${id}`)),
});

export const warehousesService = crud('warehouses');
export const locationsService = crud('locations');
export const categoriesService = crud('categories');
export const contactsService = crud('contacts');
