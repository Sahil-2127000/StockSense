import config from '../config/env.js';

// One line per request: method, URL, status and duration (quiet in tests, skips health checks)
const requestLogger = (req, res, next) => {
  if (config.NODE_ENV === 'test' || req.path === '/api/health') return next();

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const who = req.user ? ` user=${req.user.loginId}` : '';
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms${who}`);
  });
  next();
};

export default requestLogger;
