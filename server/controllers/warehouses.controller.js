import { crudController } from '../utils/crud.js';
import * as warehousesService from '../services/warehouses.service.js';

// list / get / create / update / remove, all delegating to the service
export default crudController(warehousesService);
