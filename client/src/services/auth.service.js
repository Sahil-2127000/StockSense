import { api, data, request } from './api.js';

export const authService = {
  // quiet401: "not logged in yet" on first load is normal, not a session expiry
  me: () => request('GET', '/users/me', { quiet401: true }).then((r) => r.data),
  login: (loginId, password) => data(api.post('/auth/login', { loginId, password })),
  signup: (form) => data(api.post('/auth/signup', form)),
  logout: () => data(api.post('/auth/logout')),
  forgotPassword: (email) => data(api.post('/auth/forgot-password', { email })),
  verifyOtp: (email, code) => data(api.post('/auth/verify-otp', { email, code })),
  resetPassword: (resetToken, password, confirmPassword) =>
    data(api.post('/auth/reset-password', { resetToken, password, confirmPassword })),
};
