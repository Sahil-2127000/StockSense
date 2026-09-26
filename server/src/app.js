import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import errorHandler from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';
import locationsRoutes from './modules/locations/locations.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import productsRoutes from './modules/products/products.routes.js';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
  });
});

// Feature modules
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/products', productsRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Central Error Handler (registered last)
app.use(errorHandler);

export { app };
export default app;
