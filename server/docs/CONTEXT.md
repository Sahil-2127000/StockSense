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

### Module Pattern
All features must follow a modular structure under `src/modules/<name>/`:
- `<name>.routes.js`: Defines Express router, maps endpoints, and applies validation / auth middlewares.
- `<name>.controller.js`: Handles HTTP requests (`req`, `res`), status codes, and extracts input. No business logic.
- `<name>.service.js`: Contains all business logic, data manipulation, calculations, and database calls using the shared Prisma client.
- `<name>.validation.js`: Contains Zod validation schemas for request bodies, query params, and URL params.

### Database Access
All database access must use the shared PrismaClient instance exported from `src/config/db.js`.

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
├── docs/
│   └── CONTEXT.md
├── prisma/
│   └── .gitkeep
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── middlewares/
│   │   └── .gitkeep
│   ├── modules/
│   │   └── .gitkeep
│   ├── utils/
│   │   └── .gitkeep
│   ├── app.js
│   └── server.js
├── tests/
│   └── health.test.js
├── .env.example
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── package.json
└── README.md
```
