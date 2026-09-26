import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import prisma from './config/db.js';
import requestLogger from './middlewares/requestLogger.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import docsRoutes from './routes/docs.routes.js';
import errorHandler from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';
import apiRoutes from './routes/index.js';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requestLogger);

// Health check: also confirms the database answers (503 if it does not)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: 'ok', database: 'up', uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ success: false, status: 'degraded', database: 'down' });
  }
});

// Interactive API documentation (Swagger UI) at /api/docs
app.use('/api/docs', docsRoutes);

// All feature routes (see routes/index.js)
app.use('/api', apiLimiter, apiRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Central Error Handler (registered last)
app.use(errorHandler);

export { app };
export default app;
