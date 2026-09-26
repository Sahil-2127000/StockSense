import http from 'node:http';
import app from '../../app.js';

// One real HTTP server per test file (port 0 = any free port). Tests send requests to it
// instead of letting supertest open and close a new server for every request.
export const server = http.createServer(app).listen(0);
