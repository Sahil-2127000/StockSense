import validate from '../middlewares/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crudRouter } from '../utils/crud.js';
import controller from '../controllers/products.controller.js';
import {
  createProductSchema,
  idParam,
  listProductsQuery,
  reorderRuleSchema,
  updateProductSchema,
} from '../validations/products.validation.js';

export default crudRouter({
  controller,
  schemas: { list: listProductsQuery, create: createProductSchema, update: updateProductSchema },
  extend: (router, { manager }) => {
    router.put(
      '/:id/reorder-rule',
      manager,
      validate({ params: idParam, body: reorderRuleSchema }),
      asyncHandler(controller.setReorderRule)
    );
    router.delete('/:id/reorder-rule', manager, validate({ params: idParam }), asyncHandler(controller.removeReorderRule));
  },
});
