import { crudRouter } from '../utils/crud.js';
import controller from '../controllers/locations.controller.js';
import { createLocationSchema, listLocationsQuery, updateLocationSchema } from '../validations/locations.validation.js';

export default crudRouter({
  controller,
  schemas: { list: listLocationsQuery, create: createLocationSchema, update: updateLocationSchema },
});
