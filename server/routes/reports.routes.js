import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import stockController from '../controllers/stock.controller.js';
import movesController from '../controllers/moves.controller.js';
import dashboardController from '../controllers/dashboard.controller.js';
import { dashboardQuery, movesQuery, stockQuery } from '../validations/stock.validation.js';

// Read-only views over stock, available to every logged-in user.
// authenticate is attached per route (not router.use) because this router is mounted at /api
// and must not turn unknown URLs into 401s.
const router = Router();

router.get('/stock', authenticate, validate({ query: stockQuery }), asyncHandler(stockController.list));
router.get('/moves', authenticate, validate({ query: movesQuery }), asyncHandler(movesController.list));
router.get('/dashboard', authenticate, validate({ query: dashboardQuery }), asyncHandler(dashboardController.get));

export default router;
