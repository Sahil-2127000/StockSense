import { crudRouter } from '../../utils/crud.js';
import * as service from './contacts.service.js';
import { createContactSchema, listContactsQuery, updateContactSchema } from './contacts.validation.js';

export default crudRouter({
  service,
  schemas: { list: listContactsQuery, create: createContactSchema, update: updateContactSchema },
});
