# StockSense frontend

React 19 + Vite single-page app for StockSense. It talks only to the StockSense API; there is no mock data.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run lint
```
In development Vite proxies `/api` and `/socket.io` to the API (default `http://localhost:5000`). If your API runs elsewhere, create `.env.local` from `.env.example` and set `VITE_API_TARGET`.

## How it is organised
| Folder | Purpose |
|---|---|
| `services/` | The only code that calls the backend. `api.js` wraps `fetch` (cookies, JSON, errors as `ApiError` with field errors); one service per resource; `socket.service.js` holds the live connection |
| `context/` | `AuthContext` (current user), `WarehouseContext` (warehouse picked in the top bar), `LiveContext` (Socket.IO status + low-stock alerts), `ToastContext` |
| `hooks/` | `useApi` (load data, ignore stale responses), `useLive` (react to socket events), `usePage` (pagination that resets with filters), `useDebounce`, `useDocumentTitle` |
| `components/` | App shell (`Layout`), `DataTable` + `Pagination`, form fields, `Modal` / `ConfirmDialog`, route guards, `CrudPage` for master data |
| `pages/` | Dashboard, Products, Stock, Operations (list/kanban, form, adjustments, print slip), Move history, Settings, Profile, Users, Auth |
| `styles/` | `design.css` comes straight from the approved HTML design; `app.css` adds inputs, overlays, states and the responsive layout |

## Conventions
- Forms validate on the client for quick feedback; the server validates again and its field errors are shown under the matching inputs.
- Every list supports search, filters and pagination, and refreshes itself when a live event arrives.
- Managers see create / edit / delete controls; staff get read-only settings. The server enforces the same rules.
