import sendSuccess from '../utils/response.js';
import * as stockService from '../services/stock.service.js';

export default {
  list: async (req, res) => {
    const { items, meta } = await stockService.list(req.validated.query);
    sendSuccess(res, items, 200, meta);
  },
};
