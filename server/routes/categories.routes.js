import { crudRouter } from '../utils/crud.js';
import controller from '../controllers/categories.controller.js';
import { createCategorySchema, listCategoriesQuery, updateCategorySchema } from '../validations/categories.validation.js';

export default crudRouter({
  controller,
  schemas: { list: listCategoriesQuery, create: createCategorySchema, update: updateCategorySchema },
});
