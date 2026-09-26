import sendSuccess from '../utils/response.js';
import { AUTH_COOKIE, authCookieOptions } from '../utils/token.js';
import * as usersService from '../services/users.service.js';

export const getMe = async (req, res) => {
  sendSuccess(res, await usersService.getProfile(req.user.id));
};

export const updateMe = async (req, res) => {
  sendSuccess(res, await usersService.updateProfile(req.user.id, req.validated.body));
};

export const changeMyPassword = async (req, res) => {
  const token = await usersService.changePassword(req.user.id, req.validated.body);
  res.cookie(AUTH_COOKIE, token, authCookieOptions(token));
  sendSuccess(res, { message: 'Password changed. Other sessions have been logged out.' });
};

export const list = async (req, res) => {
  const { items, meta } = await usersService.listUsers(req.validated.query);
  sendSuccess(res, items, 200, meta);
};

export const update = async (req, res) => {
  sendSuccess(res, await usersService.updateUser(req.user.id, req.validated.params.id, req.validated.body));
};
