import { crudController } from '../utils/crud.js';
import sendSuccess from '../utils/response.js';
import * as productsService from '../services/products.service.js';

export default {
  ...crudController(productsService),

  setReorderRule: async (req, res) =>
    sendSuccess(res, await productsService.setReorderRule(req.validated.params.id, req.validated.body)),

  removeReorderRule: async (req, res) =>
    sendSuccess(res, await productsService.removeReorderRule(req.validated.params.id)),
};
