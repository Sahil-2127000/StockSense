import { Server } from 'socket.io';
import config from '../config/env.js';
import { userFromToken } from '../middlewares/auth.js';
import { AUTH_COOKIE } from './token.js';

/*
 * Real-time updates. Clients connect with the same login cookie as the REST API
 * (or `auth: { token }`), and receive events whenever stock or operations change.
 * Unauthenticated connections are refused.
 */

let io = null;

const readCookie = (header = '', name) => {
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: config.CLIENT_URL, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? readCookie(socket.handshake.headers.cookie, AUTH_COOKIE);
      const user = await userFromToken(token);
      if (!user) return next(new Error('Please log in'));
      socket.data.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on('connection', (socket) => {
    socket.join(`role:${socket.data.user.role}`);
    socket.emit('connected', { user: socket.data.user });
  });

  return io;
};

export const isSocketEnabled = () => io !== null;

// Safe to call anywhere: does nothing when Socket.IO is not running (e.g. in most tests)
export const emit = (event, payload) => {
  if (io) io.emit(event, payload);
};

export const closeSocket = async () => {
  if (io) await io.close();
  io = null;
};
