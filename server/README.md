# StockSense Backend 📦

Backend API server for **StockSense**, an Inventory Management System that replaces paper registers and spreadsheets with one live, central system. Built with Express, MySQL and Prisma in modern JavaScript (ES Modules).

## ✨ Features
- **Authentication**: sign up, login (httpOnly JWT cookie), OTP password reset by email, roles (MANAGER / STAFF)
- **Master data**: warehouses, locations (racks, floors), categories, suppliers and customers, products with reorder rules
- **Operations**: receipts, delivery orders, internal transfers and stock adjustments with a Draft → Waiting / Ready → Done flow
- **Stock ledger**: every movement is logged; balances are updated in the same transaction with row locks, so stock never goes negative
- **Stock & move history**: on hand, reserved, free and value per product and location; full filterable ledger
- **Dashboard**: KPI cards, stock value, 7-day movement, low-stock and late / waiting alerts
- **Real time**: Socket.IO pushes operation, stock and low-stock events to every logged-in client
- **Docs & tests**: Swagger UI at `/api/docs`, 110 automated tests against a real MySQL test database

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v25+
- **Language**: JavaScript (ES Modules)
- **Framework**: Express.js
- **Database / ORM**: MySQL with Prisma
- **Validation**: Zod
- **Real time**: Socket.IO
- **Security**: bcrypt, JWT (httpOnly cookie), Helmet, express-rate-limit
- **API docs**: Swagger UI (OpenAPI 3)
- **Testing**: Vitest + Supertest
- **Linting & Formatting**: ESLint (Flat config) + Prettier

---

## 📂 Project Structure

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

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v25+)
- MySQL Server (v8+)

### 2. Installation
Clone the repository and install dependencies in the `server` directory:
```bash
cd server
npm install
```

### 3. Environment Configuration
Copy the example environment file and update with your local credentials:
```bash
cp .env.example .env
```

Ensure `JWT_SECRET` is at least 32 characters and `DATABASE_URL` matches your local MySQL instance.

### 4. Database Setup & Migrations
Create the MySQL database and an app user (run once as `root` in MySQL Workbench):
```sql
CREATE DATABASE IF NOT EXISTS stocksense CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS stocksense_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'stocksense'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON `stocksense`.* TO 'stocksense'@'localhost';
GRANT ALL PRIVILEGES ON `stocksense_test`.* TO 'stocksense'@'localhost';
GRANT ALL PRIVILEGES ON `prisma_migrate_shadow_db%`.* TO 'stocksense'@'localhost';
FLUSH PRIVILEGES;
```
Then create the tables and load sample data:
```bash
npm run db:migrate   # applies prisma/migrations
npm run db:seed      # users: purvika (MANAGER), aman_shaikh (STAFF), password = SEED_PASSWORD
```

### 5. Running the Application
```bash
# Development mode (with file watcher)
npm run dev

# Production mode
npm run start
```

### 6. Health Check & API Docs
```bash
curl http://localhost:5000/api/health   # use your PORT from .env
```
Expected: `{ "success": true, "status": "ok", "database": "up", "uptime": 12 }`

Open **http://localhost:5000/api/docs** to browse and try every endpoint (log in with `POST /auth/login` first).
Full reference: [docs/API.md](docs/API.md) · Database design: [docs/DATABASE.md](docs/DATABASE.md) · Team conventions: [docs/CONTEXT.md](docs/CONTEXT.md)

---

## 🧪 Testing & Code Quality

Tests run against a separate database. Create `.env.test` (a copy of `.env` with the database name `stocksense_test` and `NODE_ENV=test`), then:

```bash
# Run tests
npm run test

# Run linter
npm run lint
```
