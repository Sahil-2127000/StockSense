import { api, data } from './api.js';

export const usersService = {
  updateProfile: (body) => data(api.patch('/users/me', body)),
  changePassword: (body) => data(api.patch('/users/me/password', body)),
  list: (query) => api.get('/users', query),
  update: (id, body) => data(api.patch(`/users/${id}`, body)),
};
