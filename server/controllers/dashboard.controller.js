import sendSuccess from '../utils/response.js';
import * as dashboardService from '../services/dashboard.service.js';

export default {
  get: async (req, res) => sendSuccess(res, await dashboardService.getDashboard(req.validated.query)),
};
