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
