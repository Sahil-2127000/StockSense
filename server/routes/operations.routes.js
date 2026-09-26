import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import controller from '../controllers/operations.controller.js';
import {
  adjustmentSchema,
  createOperationSchema,
  idParam,
  listOperationsQuery,
  summaryQuery,
  updateOperationSchema,
} from '../validations/operations.validation.js';

// Operations are day-to-day warehouse work, so MANAGER and STAFF can both use them
const router = Router();
const params = validate({ params: idParam });

router.use(authenticate);

router.get('/', validate({ query: listOperationsQuery }), asyncHandler(controller.list));
router.get('/summary', validate({ query: summaryQuery }), asyncHandler(controller.summary));
router.post('/', validate({ body: createOperationSchema }), asyncHandler(controller.create));
router.post('/adjustments', validate({ body: adjustmentSchema }), asyncHandler(controller.createAdjustment));

router.get('/:id', params, asyncHandler(controller.get));
router.patch('/:id', validate({ params: idParam, body: updateOperationSchema }), asyncHandler(controller.update));
router.delete('/:id', params, asyncHandler(controller.remove));

router.post('/:id/confirm', params, asyncHandler(controller.confirm));
router.post('/:id/check-availability', params, asyncHandler(controller.checkAvailability));
router.post('/:id/validate', params, asyncHandler(controller.validate));
router.post('/:id/cancel', params, asyncHandler(controller.cancel));

export default router;
