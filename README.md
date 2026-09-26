# StockSense 📦

An **Inventory Management System** that replaces paper registers and spreadsheets with one live, central app for receipts, deliveries, internal transfers and stock adjustments across multiple warehouses.

Built with **MySQL · Express · React · Node.js** (the MERN idea with a SQL database instead of MongoDB).

---

## ✨ Features

| Area | What you can do |
|---|---|
| **Authentication** | Sign up (live password rules), log in, OTP password reset by email (6-digit code, 10-min expiry, 60 s resend, 5 attempts), roles: Inventory Manager / Warehouse Staff |
| **Dashboard** | KPI cards (products in stock, low / out of stock, pending receipts, pending deliveries, scheduled transfers), receipt & delivery cards, 7-day movement chart, stock value, needs-attention list, recent operations; filter by warehouse, location and category |
| **Products** | Create / edit with SKU, category, unit, cost, reorder rule and initial stock; stock per location, free-to-use quantity, low-stock status and suggested reorder |
| **Receipts** | Draft → Ready → Done; validating adds stock |
| **Deliveries** | Draft → Waiting (short on stock) ⇄ Ready → Done; "Check availability", shortage warnings, delivery address |
| **Internal transfers** | Move stock between locations or warehouses; the total stays the same |
| **Adjustments** | Enter a physical count; the difference is logged as a gain or loss |
| **Stock** | Stock per product and location with value; inline "Update" records a count |
| **Move history** | Full ledger: every move, incoming in green, outgoing in red, with filters |
| **Settings** | Warehouses, locations, categories, suppliers & customers, user management (managers) |
| **Real time** | Socket.IO pushes changes to every logged-in user: lists, dashboard and low-stock alerts update instantly |
| **Everywhere** | Search, filters, pagination, list + kanban views, printable slips, responsive layout for phones and tablets |

## 🧱 Tech stack

| Layer | Tools |
|---|---|
| Database | MySQL 8 · Prisma ORM (schema, migrations, seed) |
| Backend | Node.js · Express 5 · Zod validation · JWT in httpOnly cookies · bcrypt · Helmet · rate limiting · Socket.IO · Nodemailer |
| Frontend | React 19 · React Router 7 · Vite · Socket.IO client · plain CSS from the approved design system |
| Quality | Vitest + Supertest (113 API tests on a real MySQL test database) · ESLint · Swagger / OpenAPI docs |

## 📁 Project structure

```
stockSense/
├── server/                 Express API (see server/README.md)
│   ├── config/  routes/  controllers/  services/  validations/  middlewares/  utils/
│   ├── prisma/             schema.prisma, migrations/, seed.js
│   ├── tests/              113 automated tests
│   └── docs/               API.md, DATABASE.md, CONTEXT.md, openapi.js
└── client/                 React app (see client/README.md)
    └── src/
        ├── services/       all API calls (one fetch wrapper + one file per resource) and the socket
        ├── context/        auth, warehouse filter, live updates, toasts
        ├── hooks/          useApi, useLive, usePage, useDebounce
        ├── components/     layout, tables, forms, modals, guards
        ├── pages/          dashboard, products, stock, operations, settings, auth, profile
        ├── utils/          formatting and shared constants
        └── styles/         design system (from the HTML design) + app styles
```

## 🚀 Getting started

**Requirements:** Node.js 20+ (tested on 25), MySQL 8.

### 1. Database (once, as MySQL `root`, e.g. in MySQL Workbench)
```sql
CREATE DATABASE IF NOT EXISTS stocksense CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS stocksense_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'stocksense'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON `stocksense`.* TO 'stocksense'@'localhost';
GRANT ALL PRIVILEGES ON `stocksense_test`.* TO 'stocksense'@'localhost';
GRANT ALL PRIVILEGES ON `prisma_migrate_shadow_db%`.* TO 'stocksense'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend
```bash
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, SEED_PASSWORD
npm install
npm run db:migrate          # creates the tables
npm run db:seed             # sample warehouse, products, contacts and operations
npm run dev                 # http://localhost:5000  (API docs: /api/docs)
```

### 3. Frontend (second terminal)
```bash
cd client
cp .env.example .env.local  # only if the API is not on port 5000
npm install
npm run dev                 # http://localhost:5173
```

### 4. Log in
| Login ID | Role | Password |
|---|---|---|
| `purvika` | Inventory Manager | the `SEED_PASSWORD` from `server/.env` |
| `aman_shaikh` | Warehouse Staff | the `SEED_PASSWORD` from `server/.env` |

OTP emails: with real SMTP details in `server/.env` the code is emailed; without them it is printed in the server console.

## 🧪 Quality checks
```bash
cd server && npm test && npm run lint     # 113 API tests + lint
cd client && npm run lint && npm run build
```

## 📚 Documentation
- [API reference](server/docs/API.md) and interactive Swagger UI at `/api/docs`
- [Database design](server/docs/DATABASE.md): tables, relations, why stock is a ledger + balance
- [Team conventions](server/docs/CONTEXT.md): structure, patterns, Git workflow
