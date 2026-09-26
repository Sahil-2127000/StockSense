import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as controller from '../controllers/users.controller.js';
import {
  changePasswordSchema,
  idParam,
  listUsersQuery,
  updateProfileSchema,
  updateUserSchema,
} from '../validations/users.validation.js';

const router = Router();

router.use(authenticate);

router.get('/me', asyncHandler(controller.getMe));
router.patch('/me', validate({ body: updateProfileSchema }), asyncHandler(controller.updateMe));
router.patch('/me/password', validate({ body: changePasswordSchema }), asyncHandler(controller.changeMyPassword));

router.get('/', requireRole('MANAGER'), validate({ query: listUsersQuery }), asyncHandler(controller.list));
router.patch('/:id', requireRole('MANAGER'), validate({ params: idParam, body: updateUserSchema }), asyncHandler(controller.update));

export default router;
