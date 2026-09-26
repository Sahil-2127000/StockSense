# StockSense Backend 📦

Backend API server for **StockSense**, a modular Inventory Management System built with Express, MySQL, and Prisma in modern JavaScript (ES Modules).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v25+
- **Language**: JavaScript (ES Modules)
- **Framework**: Express.js
- **Database / ORM**: MySQL with Prisma
- **Validation**: Zod
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

### 6. Health Check
Verify the server is running:
```bash
curl http://localhost:5000/api/health   # use your PORT from .env
```
Expected response:
```json
{
  "success": true,
  "status": "ok"
}
```

---

## 🧪 Testing & Code Quality

```bash
# Run tests
npm run test

# Run linter
npm run lint
```
