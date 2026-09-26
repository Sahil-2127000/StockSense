import sendSuccess from '../utils/response.js';
import * as movesService from '../services/moves.service.js';

export default {
  list: async (req, res) => {
    const { items, meta } = await movesService.list(req.validated.query);
    sendSuccess(res, items, 200, meta);
  },
};
