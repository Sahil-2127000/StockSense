import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import asyncHandler from './asyncHandler.js';
import sendSuccess from './response.js';
import { idParam } from './validators.js';

// Standard controller for a service exposing list / getById / create / update / remove
export const crudController = (service) => ({
  list: async (req, res) => {
    const { items, meta } = await service.list(req.validated?.query ?? {});
    sendSuccess(res, items, 200, meta);
  },
  get: async (req, res) => sendSuccess(res, await service.getById(req.validated.params.id)),
  create: async (req, res) => sendSuccess(res, await service.create(req.validated.body, req.user), 201),
  update: async (req, res) =>
    sendSuccess(res, await service.update(req.validated.params.id, req.validated.body, req.user)),
  remove: async (req, res) => {
    await service.remove(req.validated.params.id);
    sendSuccess(res, { id: req.validated.params.id, deleted: true });
  },
});

/**
 * Router for master data: every route needs login; reading is open to all roles,
 * writing (create / update / delete) is MANAGER only.
 * `extend(router, { manager })` can add extra routes before the /:id routes.
 */
export const crudRouter = ({ controller, schemas, extend }) => {
  const router = Router();
  const manager = requireRole('MANAGER');

  router.use(authenticate);
  if (extend) extend(router, { manager });

  router.get('/', validate({ query: schemas.list }), asyncHandler(controller.list));
  router.post('/', manager, validate({ body: schemas.create }), asyncHandler(controller.create));
  router.get('/:id', validate({ params: idParam }), asyncHandler(controller.get));
  router.patch('/:id', manager, validate({ params: idParam, body: schemas.update }), asyncHandler(controller.update));
  router.delete('/:id', manager, validate({ params: idParam }), asyncHandler(controller.remove));

  return router;
};
