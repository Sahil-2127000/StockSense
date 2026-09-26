import { crudRouter } from '../../utils/crud.js';
import * as service from './locations.service.js';
import { createLocationSchema, listLocationsQuery, updateLocationSchema } from './locations.validation.js';

export default crudRouter({
  service,
  schemas: { list: listLocationsQuery, create: createLocationSchema, update: updateLocationSchema },
});
