import { z } from 'zod';
import { paginationQuery } from '../utils/validators.js';

const name = z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(40);

export const createCategorySchema = z.object({ name });
export const updateCategorySchema = z.object({ name });
export const listCategoriesQuery = paginationQuery;
