import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import warehousesRoutes from './warehouses.routes.js';
import locationsRoutes from './locations.routes.js';
import categoriesRoutes from './categories.routes.js';
import contactsRoutes from './contacts.routes.js';
import productsRoutes from './products.routes.js';
import operationsRoutes from './operations.routes.js';
import reportsRoutes from './reports.routes.js';

// Every API route, mounted under /api in app.js
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/warehouses', warehousesRoutes);
router.use('/locations', locationsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/contacts', contactsRoutes);
router.use('/products', productsRoutes);
router.use('/operations', operationsRoutes);
router.use('/', reportsRoutes); // /stock, /moves, /dashboard

export default router;
