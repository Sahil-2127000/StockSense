import { crudRouter } from '../utils/crud.js';
import controller from '../controllers/contacts.controller.js';
import { createContactSchema, listContactsQuery, updateContactSchema } from '../validations/contacts.validation.js';

export default crudRouter({
  controller,
  schemas: { list: listContactsQuery, create: createContactSchema, update: updateContactSchema },
});
