# StockSense - Project Context & Architecture

## Overview
StockSense is an Inventory Management System built with Express, MySQL, and Prisma in plain JavaScript (ES Modules, `"type": "module"`) on Node.js (v25+).

## Tech Stack
- **Runtime / Language**: Node.js (v25+), Plain JavaScript (NO TypeScript), ES Modules (`"type": "module"`)
- **Web Framework**: Express.js
- **Database & ORM**: MySQL + Prisma ORM
- **Validation**: Zod
- **Authentication & Security**: bcrypt, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit
- **Real-Time Communication**: Socket.io
- **Email Service**: Nodemailer
- **Code Quality**: ESLint (flat config), Prettier
- **Testing**: Vitest, Supertest

## Team Responsibilities & Ownership Split
- **Sahil**:
  - Project setup & skeleton
  - Shared middlewares (auth, validation, error handler, rate limiters)
  - Authentication & User Management modules
  - Operations engine (stock operations, receipts, deliveries, internal transfers, adjustments)
  - Real-time updates & WebSocket integration via Socket.io
- **Purvika**:
  - Database schema & seed scripts (`prisma/schema.prisma`, `prisma/seed.js`)
  - Master data modules (Warehouses, Locations, Categories, Contacts/Vendors/Customers, Products)
  - Stock levels & Move history / Ledger
  - Dashboard analytics & reporting
  - API documentation

## Architecture & Code Conventions

### Layered Structure
Each feature (e.g. `products`) has one file in each layer:
- `routes/products.routes.js`: Express router. Maps URLs to controllers and applies `authenticate`, `requireRole` and `validate`.
- `controllers/products.controller.js`: Reads `req.validated` / `req.user`, calls the service, sends the response with `sendSuccess`. No business logic.
- `services/products.service.js`: All business rules and database calls through the shared Prisma client.
- `validations/products.validation.js`: Zod schemas for body, query and params.

Request flow: `route → validate → controller → service → Prisma → MySQL`.
Master-data controllers and routers use the shared `crudController` / `crudRouter` helpers in `utils/crud.js` so list / get / create / update / delete behave the same everywhere.
Stock is only ever changed through `services/stock.engine.js` (`moveStock`), inside a transaction.

### Database Access
All database access must use the shared PrismaClient instance exported from `config/db.js`.

### Standardized API Response Format
All API endpoints must adhere to the following response envelope:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // Optional (e.g., pagination: page, limit, total)
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [ ... ] // Optional field-level validation errors or details
}
```

## Directory Structure
```
server/
├── config/          # db.js (the ONE shared PrismaClient), env.js (validated environment)
├── routes/          # URL → middleware → controller. index.js mounts every router under /api
├── controllers/     # Read the request, call a service, send the response (no business logic)
├── services/        # Business logic and database access (stock.engine.js changes stock)
├── validations/     # Zod schemas for request body / query / params
├── middlewares/     # auth (login + roles), validate, rateLimit, errorHandler
├── utils/           # ApiError, asyncHandler, response, pagination, token, mailer, validators, crud
├── prisma/          # schema.prisma (the models), migrations/, seed.js
├── tests/           # Vitest + Supertest suites and helpers
├── docs/            # CONTEXT.md, DATABASE.md, API.md
├── app.js           # Express app (no listen, so tests can import it)
├── server.js        # Connects to MySQL, starts the HTTP server, graceful shutdown
├── .env.example     # Template for .env (never commit .env)
└── package.json
```

## Git Workflow
- Never commit directly to `main`; work on your own branch and merge through a Pull Request.
- Before starting work: `git checkout main && git pull`, then merge `main` into your branch.
- Never force-push to shared branches. Never commit `.env`, `.env.test` or `node_modules`.
- Schema changes: edit `schema.prisma`, run `npx prisma migrate dev --name <change>`, and commit the new migration folder.

## Testing
- Tests use a separate database. Create `server/.env.test` as a copy of `.env` with the database name changed to `stocksense_test` and `NODE_ENV=test` (it is git-ignored).
- `npm test` applies migrations to the test database, and every test file empties the tables with `resetDatabase()` from `tests/helpers/db.js`.
- Use `createUser()` / `loginAs(role)` from `tests/helpers/auth.js` for authenticated requests.
- Emails are not sent in tests; read them from `sentMails` in `utils/mailer.js`.
