import validate from '../../middlewares/validate.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import sendSuccess from '../../utils/response.js';
import * as service from './products.service.js';
import {
  createProductSchema,
  idParam,
  listProductsQuery,
  reorderRuleSchema,
  updateProductSchema,
} from './products.validation.js';

export default crudRouter({
  service,
  schemas: { list: listProductsQuery, create: createProductSchema, update: updateProductSchema },
  extend: (router, { manager }) => {
    router.put(
      '/:id/reorder-rule',
      manager,
      validate({ params: idParam, body: reorderRuleSchema }),
      asyncHandler(async (req, res) =>
        sendSuccess(res, await service.setReorderRule(req.validated.params.id, req.validated.body))
      )
    );
    router.delete(
      '/:id/reorder-rule',
      manager,
      validate({ params: idParam }),
      asyncHandler(async (req, res) => sendSuccess(res, await service.removeReorderRule(req.validated.params.id)))
    );
  },
});
