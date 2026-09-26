import { io } from 'socket.io-client';

/*
 * One shared Socket.IO connection for live updates. It uses the same login cookie
 * as the API, so it is opened after login and closed on logout.
 */
let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
