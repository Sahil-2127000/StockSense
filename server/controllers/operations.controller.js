import { crudController } from '../utils/crud.js';
import sendSuccess from '../utils/response.js';
import * as operationsService from '../services/operations.service.js';

const byId = (action) => async (req, res) => sendSuccess(res, await action(req.validated.params.id));

export default {
  ...crudController(operationsService),

  summary: async (req, res) => sendSuccess(res, await operationsService.summary(req.validated.query)),
  confirm: byId(operationsService.confirm),
  checkAvailability: byId(operationsService.checkAvailability),
  validate: byId(operationsService.validate),
  cancel: byId(operationsService.cancel),

  createAdjustment: async (req, res) =>
    sendSuccess(res, await operationsService.createAdjustment(req.validated.body, req.user), 201),
};
