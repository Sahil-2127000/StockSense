import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import openapi from '../docs/openapi.js';

// Swagger UI for trying the API in the browser; the raw spec is at /api/docs/openapi.json
const router = Router();

router.get('/openapi.json', (req, res) => res.json(openapi));
router.use('/', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'StockSense API' }));

export default router;
