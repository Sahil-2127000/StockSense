import { crudRouter } from '../utils/crud.js';
import controller from '../controllers/warehouses.controller.js';
import { createWarehouseSchema, listWarehousesQuery, updateWarehouseSchema } from '../validations/warehouses.validation.js';

export default crudRouter({
  controller,
  schemas: { list: listWarehousesQuery, create: createWarehouseSchema, update: updateWarehouseSchema },
});
