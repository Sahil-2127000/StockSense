import { crudController } from '../utils/crud.js';
import * as locationsService from '../services/locations.service.js';

// list / get / create / update / remove, all delegating to the service
export default crudController(locationsService);
