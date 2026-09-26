# StockSense API Reference

Base URL: `http://localhost:<PORT>/api`

- All requests and responses are JSON.
- Login sets an **httpOnly cookie** named `token`. From the browser, call the API with `credentials: 'include'` (fetch) or `withCredentials: true` (axios). Postman keeps the cookie automatically; `Authorization: Bearer <token>` also works.
- 🔒 = login required · 👑 = MANAGER only

### Response format
```json
{ "success": true, "data": { }, "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "Enter a valid email address" }] }
```

### Status codes
| Code | Meaning |
|---|---|
| 200 / 201 | OK / created |
| 400 | Validation failed (see `errors[]`) or invalid action |
| 401 | Not logged in, session expired, or wrong login details |
| 403 | Logged in but not allowed (e.g. STAFF on a manager route) |
| 404 | Not found |
| 409 | Conflict (duplicate value, record in use, wrong status) |
| 429 | Too many attempts (rate limit) |

### List endpoints
Every list accepts `?page=1&limit=20` (max 100) and `?q=` for search, and returns `meta` for pagination.

---

## Auth — `/api/auth`

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/signup` | `loginId, email, fullName, password, confirmPassword` | 201 → user. New accounts are always STAFF |
| POST | `/login` | `loginId, password` | Sets cookie, returns user. Wrong details → 401 `Invalid Login Id or Password`. Max 10 tries / 15 min |
| POST | `/logout` | — | Clears cookie |
| POST | `/forgot-password` | `email` | Always 200 (never reveals if the email exists). Sends a 6-digit code, valid 10 min, one per 60 s |
| POST | `/verify-otp` | `email, code` | → `{ resetToken }` (valid 15 min). 5 wrong tries locks the code |
| POST | `/reset-password` | `resetToken, password, confirmPassword` | Sets the new password; the token works once |

**Validation rules**
- `loginId`: 6–12 characters, letters / numbers / underscore, unique
- `email`: valid email, unique (stored lowercase)
- `password`: more than 8 characters with a lowercase letter, an uppercase letter and a special character

## Users — `/api/users` 🔒

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/me` | — | Current user |
| PATCH | `/me` | `fullName?, email?` | Update profile |
| PATCH | `/me/password` | `currentPassword, password, confirmPassword` | Change password |
| GET | `/` 👑 | `?role=MANAGER\|STAFF&isActive=true\|false&q=` | List users |
| PATCH | `/:id` 👑 | `role?, isActive?` | Promote / deactivate. You cannot demote or deactivate yourself |

**User object**
```json
{ "id": 1, "loginId": "purvika", "email": "purvika@example.com", "fullName": "Purvika Jain", "role": "MANAGER", "isActive": true, "createdAt": "2026-09-26T08:13:53.796Z" }
```

---

## Master data 🔒 (read: any role · create / update / delete: 👑 MANAGER)

Every module below has the same five routes:

| Method | Path | Notes |
|---|---|---|
| GET | `/` | List (`?page&limit&q` + filters below), returns `meta` |
| GET | `/:id` | One record |
| POST | `/` 👑 | Create → 201 |
| PATCH | `/:id` 👑 | Partial update |
| DELETE | `/:id` 👑 | Delete (409 if the record is in use) |

Numbers (quantities, costs) are returned as JSON numbers, e.g. `"quantity": 7.5`.

### Warehouses — `/api/warehouses`
- Body: `name` (2–60), `shortCode` (2–5 letters/digits, stored uppercase, unique), `address?`
- Creating a warehouse also creates its default location `<CODE>/Stock`.
- `shortCode` is the prefix of document references (`WH/IN/0001`), so it can only change while the warehouse has no operations. Location paths are renamed with it.
- Delete: blocked while it holds stock or has operation history.

### Locations — `/api/locations`
- Filters: `?warehouseId=&type=INTERNAL|VENDOR|CUSTOMER|ADJUSTMENT`
- Body (create): `warehouseId, name, shortCode` (1–10 letters/digits/dashes). `fullPath` is built by the server: `WH/RackA`.
- PATCH: `name` only. `GET /:id` includes `stock: [{ product, quantity }]`.
- System locations (Vendors, Customers, Inventory Adjustment) cannot be deleted; locations with stock or history cannot be deleted.

### Categories — `/api/categories`
- Body: `name` (2–40, unique, case-insensitive). List includes `_count.products`. Delete blocked while products use it.

### Contacts — `/api/contacts`
- Filters: `?type=SUPPLIER|CUSTOMER`
- Body: `name, type, email?, phone?, address?`. Type cannot change once used in operations; used contacts cannot be deleted.

### Products — `/api/products`
- Filters: `?categoryId=&warehouseId=&stockStatus=OK|LOW|OUT&isActive=true|false&q=` (q searches name and SKU)
- Body (create):
```json
{
  "name": "Steel Rod", "sku": "STRD-001", "categoryId": 1, "uom": "kg", "unitCost": 85,
  "reorderRule": { "minQty": 50, "maxQty": 200 },
  "initialStock": { "locationId": 1, "quantity": 40 }
}
```
  - `sku`: 3–20 letters/digits/dashes, stored uppercase, unique · `uom`: 1–10 letters (pcs, kg, roll)
  - `initialStock` is booked as a DONE adjustment (e.g. `WH/ADJ/0003`), so it appears in the move history.
- PATCH: `name, sku, categoryId, uom, unitCost, isActive`
- `PUT /:id/reorder-rule` 👑 `{ minQty, maxQty }` · `DELETE /:id/reorder-rule` 👑
- DELETE: only for products without history; otherwise deactivate with `PATCH { "isActive": false }`.

**Product object (list and detail)**
```json
{
  "id": 1, "name": "Steel Rod", "sku": "STRD001", "uom": "kg", "unitCost": 85, "isActive": true,
  "category": { "id": 1, "name": "Raw Material" },
  "reorderRule": { "minQty": 50, "maxQty": 200 },
  "onHand": 47, "reserved": 0, "free": 47, "stockStatus": "LOW"
}
```
- `onHand`: total in warehouse locations · `reserved`: on READY deliveries/transfers · `free` = onHand − reserved
- `stockStatus`: `OUT` (nothing left), `LOW` (at or below `minQty`), `OK`
- Detail (`GET /:id`) also returns `stockByLocation: [{ location, quantity }]` and `suggestedReorderQty` (`maxQty − onHand` when LOW/OUT).

---

## Operations — `/api/operations` 🔒 (MANAGER and STAFF)

Receipts, deliveries, internal transfers and adjustments share one endpoint; `type` tells them apart.

| Type | From → To | Contact | Flow |
|---|---|---|---|
| `RECEIPT` | Vendors → `destLocationId` | supplier (required) | DRAFT → READY → DONE |
| `DELIVERY` | `sourceLocationId` → Customers | customer (required) | DRAFT → WAITING ⇄ READY → DONE |
| `TRANSFER` | `sourceLocationId` → `destLocationId` | — | DRAFT → WAITING ⇄ READY → DONE |
| `ADJUSTMENT` | created by `POST /adjustments` | — | DONE immediately |

Open operations (DRAFT / WAITING / READY) can be **cancelled**. Stock changes only on **DONE**.
**Late** = still open and scheduled before today (`isLate: true`).
References are generated per warehouse and type: `WH/IN/0001`, `WH/OUT/0001`, `WH/INT/0001`, `WH/ADJ/0001`.

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/` | `?type=RECEIPT,DELIVERY&status=READY,WAITING&warehouseId=&locationId=&contactId=&productId=&late=true&from=&to=&q=` | `type` / `status` accept comma lists. `q` searches reference and contact name. Sorted by schedule date (newest first) |
| GET | `/summary` | `?type=&warehouseId=` | `{ DRAFT, WAITING, READY, DONE, CANCELLED, late, total }` for kanban columns and badges |
| POST | `/` | see below | Creates a DRAFT; the signed-in user becomes `responsible` |
| GET | `/:id` | — | Detail. Open deliveries/transfers include `availability[]`; DONE ones include `stockMoves[]` |
| PATCH | `/:id` | same fields as create (no `type`) | DRAFT only. `lines` replaces all lines |
| DELETE | `/:id` | — | DRAFT only (otherwise cancel) |
| POST | `/:id/confirm` | — | DRAFT → READY, or WAITING when a delivery/transfer is short on stock |
| POST | `/:id/check-availability` | — | Re-tests stock: WAITING ⇄ READY |
| POST | `/:id/validate` | — | READY → DONE and moves the stock. 409 `Not enough stock` if it ran out meanwhile |
| POST | `/:id/cancel` | — | Open → CANCELLED |
| POST | `/adjustments` | `productId, locationId, countedQuantity, reason?` | Books the difference to the recorded stock as a DONE adjustment. 400 if there is no difference |

**Create body**
```json
{
  "type": "DELIVERY",
  "contactId": 4,
  "sourceLocationId": 1,
  "scheduleDate": "2026-09-28T10:00:00.000Z",
  "notes": "Deliver before noon",
  "lines": [{ "productId": 7, "quantity": 12 }]
}
```
- RECEIPT needs `contactId` (supplier) + `destLocationId`; DELIVERY needs `contactId` (customer) + `sourceLocationId`; TRANSFER needs both locations (different).
- `lines`: 1–100 products, each product once, `quantity > 0` (max 3 decimals).
- `scheduleDate` defaults to now.

**Availability (open deliveries / transfers)**
```json
"availability": [{ "productId": 7, "requested": 12, "available": 3, "enough": false }]
```
`available` = stock at the source location minus what other READY operations there have reserved.

**Safety guarantees**
- Validating locks the stock rows; two validations at the same moment cannot both use the same stock, and stock never goes negative.
- Every status change checks the current status in the same database write, so double clicks cannot validate twice.

---

## Stock, move history and dashboard 🔒 (read-only, any role)

### Stock — `GET /api/stock`
One row per active product. Filters: `?warehouseId=&locationId=&categoryId=&inStock=true&q=`
```json
{
  "product": { "id": 1, "name": "Steel Rod", "sku": "STRD001", "uom": "kg", "category": { "id": 1, "name": "Raw Material" } },
  "unitCost": 85, "onHand": 47, "reserved": 0, "free": 47, "value": 3995, "stockStatus": "LOW",
  "reorderRule": { "minQty": 50, "maxQty": 200 },
  "byLocation": [{ "location": { "id": 3, "fullPath": "WH/Prod" }, "quantity": 27 }]
}
```
`meta` also contains `totalUnits` and `totalValue` for the whole filtered stock (not just the page).
The "Update" action on the Stock page = `POST /api/operations/adjustments` with the counted quantity.

### Move history — `GET /api/moves`
The stock ledger: one row per product per move, newest first.
Filters: `?productId=&locationId=&warehouseId=&type=RECEIPT,DELIVERY&direction=IN|OUT|INTERNAL&from=&to=&q=` (`q` searches reference, contact, product name and SKU)
```json
{
  "id": 12, "quantity": 30, "createdAt": "2026-09-24T16:15:00.000Z", "direction": "INTERNAL",
  "operation": { "id": 5, "reference": "WH/INT/0001", "type": "TRANSFER", "status": "DONE", "contact": null, "responsible": { "id": 2, "fullName": "Aman Shaikh" } },
  "product": { "id": 1, "name": "Steel Rod", "sku": "STRD001", "uom": "kg" },
  "fromLocation": { "fullPath": "WH/Stock1", "type": "INTERNAL" },
  "toLocation": { "fullPath": "WH/Prod", "type": "INTERNAL" }
}
```
`direction`: `IN` (arrives from a vendor / adjustment gain, show green), `OUT` (leaves to a customer / adjustment loss, show red), `INTERNAL` (between warehouse locations).

### Dashboard — `GET /api/dashboard`
Everything for the landing page in one call. Filters: `?warehouseId=&categoryId=`

| Field | Content |
|---|---|
| `kpis` | `totalProductsInStock, lowStock, outOfStock, pendingReceipts, pendingDeliveries, scheduledTransfers, lateReceipts, lateDeliveries, waitingDeliveries` |
| `stockValue` | `{ units, value }` (value = Σ quantity × unit cost) |
| `movement` | 7 items `{ day: "2026-09-26", incoming, outgoing, internal }`, oldest first, in the server's local day |
| `needsAttention.lowStock` | OUT first, then LOW: `{ product, onHand, minQty, status, suggestedReorderQty }` |
| `needsAttention.waitingOperations` | Waiting deliveries/transfers with `shortages: [{ product, requested, available, missing }]` |
| `needsAttention.lateOperations` | Open operations scheduled before today |
| `recentOperations` | Last 8 changed operations |

For document-type / status filters on lists, use `GET /api/operations?type=&status=` and `GET /api/operations/summary`.
