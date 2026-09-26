import { crudController } from '../utils/crud.js';
import * as contactsService from '../services/contacts.service.js';

// list / get / create / update / remove, all delegating to the service
export default crudController(contactsService);
