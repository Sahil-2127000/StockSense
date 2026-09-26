import { crudController } from '../utils/crud.js';
import * as categoriesService from '../services/categories.service.js';

// list / get / create / update / remove, all delegating to the service
export default crudController(categoriesService);
