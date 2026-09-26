import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import app from '../src/app.js';
import validate from '../src/middlewares/validate.js';
import errorHandler from '../src/middlewares/errorHandler.js';
import ApiError from '../src/utils/ApiError.js';
import asyncHandler from '../src/utils/asyncHandler.js';
import sendSuccess from '../src/utils/response.js';
import { getPagination, buildMeta } from '../src/utils/pagination.js';

describe('StockSense Core Middleware & Utilities', () => {
  describe('Health check and 404 route', () => {
    it('GET /api/health returns 200 and status ok', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: 'ok',
      });
    });

    it('GET /api/unknown-route returns 404 JSON response', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'Route not found: GET /api/unknown-route',
      });
    });
  });

  describe('Invalid JSON Body Handling', () => {
    it('returns 400 when body parser encounters malformed JSON', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test-json', (req, res) => res.json({ ok: true }));
      testApp.use(errorHandler);

      const response = await request(testApp)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{"broken": json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid JSON body');
    });
  });

  describe('validate middleware with Zod', () => {
    const testApp = express();
    testApp.use(express.json());

    const testSchema = {
      body: z.object({
        email: z.string().email('Invalid email address'),
        age: z.number().min(18, 'Must be at least 18'),
      }),
      query: z.object({
        role: z.enum(['admin', 'user']).optional(),
      }),
    };

    testApp.post(
      '/test-validate',
      validate(testSchema),
      (req, res) => {
        sendSuccess(res, { user: req.validated.body });
      }
    );

    testApp.use(errorHandler);

    it('returns 400 and field errors on invalid payload', async () => {
      const response = await request(testApp)
        .post('/test-validate')
        .send({
          email: 'invalid-email',
          age: 15,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual([
        { field: 'email', message: 'Invalid email address' },
        { field: 'age', message: 'Must be at least 18' },
      ]);
    });

    it('passes and returns success when payload is valid', async () => {
      const response = await request(testApp)
        .post('/test-validate')
        .send({
          email: 'test@example.com',
          age: 25,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        user: {
          email: 'test@example.com',
          age: 25,
        },
      });
    });
  });

  describe('Central errorHandler edge cases', () => {
    const errorApp = express();
    errorApp.use(express.json());

    errorApp.get(
      '/error/prisma-p2002',
      asyncHandler(async () => {
        const error = new Error('Unique constraint failed');
        error.code = 'P2002';
        error.meta = { target: ['email'] };
        throw error;
      })
    );

    errorApp.get(
      '/error/prisma-p2025',
      asyncHandler(async () => {
        const error = new Error('Record not found');
        error.code = 'P2025';
        error.meta = { cause: 'Product not found' };
        throw error;
      })
    );

    errorApp.get(
      '/error/prisma-p2003',
      asyncHandler(async () => {
        const error = new Error('Foreign key failed');
        error.code = 'P2003';
        throw error;
      })
    );

    errorApp.get(
      '/error/api-conflict',
      asyncHandler(async () => {
        throw ApiError.conflict('SKU already exists');
      })
    );

    errorApp.get(
      '/error/api-unauthorized',
      asyncHandler(async () => {
        throw ApiError.unauthorized('Token expired');
      })
    );

    errorApp.get(
      '/error/api-forbidden',
      asyncHandler(async () => {
        throw ApiError.forbidden('Access denied');
      })
    );

    errorApp.get(
      '/error/unexpected',
      asyncHandler(async () => {
        throw new Error('Database connection crashed');
      })
    );

    errorApp.use(errorHandler);

    it('maps Prisma P2002 to 409 conflict with field message', async () => {
      const response = await request(errorApp).get('/error/prisma-p2002');
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('email already exists');
    });

    it('maps Prisma P2025 to 404 not found', async () => {
      const response = await request(errorApp).get('/error/prisma-p2025');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Product not found');
    });

    it('maps Prisma P2003 to 409 record is in use', async () => {
      const response = await request(errorApp).get('/error/prisma-p2003');
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Record is in use');
    });

    it('handles ApiError conflict and auth errors', async () => {
      const conflictRes = await request(errorApp).get('/error/api-conflict');
      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.message).toBe('SKU already exists');

      const authRes = await request(errorApp).get('/error/api-unauthorized');
      expect(authRes.status).toBe(401);
      expect(authRes.body.message).toBe('Token expired');

      const forbiddenRes = await request(errorApp).get('/error/api-forbidden');
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.message).toBe('Access denied');
    });

    it('maps unknown errors to 500 Something went wrong', async () => {
      const response = await request(errorApp).get('/error/unexpected');
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Something went wrong');
    });
  });

  describe('Pagination and Response Helpers', () => {
    it('calculates pagination limits and skip values correctly', () => {
      expect(getPagination({ page: '2', limit: '10' })).toEqual({
        skip: 10,
        take: 10,
        page: 2,
        limit: 10,
      });

      // Default fallback
      expect(getPagination({})).toEqual({
        skip: 0,
        take: 20,
        page: 1,
        limit: 20,
      });

      // Max limit clamping
      expect(getPagination({ page: '1', limit: '500' })).toEqual({
        skip: 0,
        take: 100,
        page: 1,
        limit: 100,
      });
    });

    it('builds pagination metadata accurately', () => {
      expect(buildMeta(95, 2, 20)).toEqual({
        total: 95,
        page: 2,
        limit: 20,
        totalPages: 5,
      });
    });
  });
});
