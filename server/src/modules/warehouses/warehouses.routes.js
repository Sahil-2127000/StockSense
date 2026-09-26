import { crudRouter } from '../../utils/crud.js';
import * as service from './warehouses.service.js';
import { createWarehouseSchema, listWarehousesQuery, updateWarehouseSchema } from './warehouses.validation.js';

export default crudRouter({
  service,
  schemas: { list: listWarehousesQuery, create: createWarehouseSchema, update: updateWarehouseSchema },
});
