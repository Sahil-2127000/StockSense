import { crudRouter } from '../../utils/crud.js';
import * as service from './categories.service.js';
import { createCategorySchema, listCategoriesQuery, updateCategorySchema } from './categories.validation.js';

export default crudRouter({
  service,
  schemas: { list: listCategoriesQuery, create: createCategorySchema, update: updateCategorySchema },
});
