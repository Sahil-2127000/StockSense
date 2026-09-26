/*
 * The single place that talks to the backend.
 * - Every request goes to /api (Vite proxies it to the Express server in development).
 * - The login cookie is sent automatically (credentials: 'include').
 * - Errors are thrown as ApiError with the server's message and field errors.
 */

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  // { email: 'Enter a valid email address', ... } for showing errors under inputs
  get fieldErrors() {
    return Object.fromEntries(this.errors.map((e) => [e.field, e.message]));
  }
}

// Fired when the server says the session is gone, so the app can go back to login
export const SESSION_EXPIRED = 'stocksense:session-expired';

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export async function request(method, path, { body, query, quiet401 = false } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}${toQuery(query)}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and that the API is running.');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    if (response.status === 401 && !quiet401) window.dispatchEvent(new Event(SESSION_EXPIRED));
    throw new ApiError(response.status, payload.message || `Request failed (${response.status})`, payload.errors || []);
  }
  return { data: payload.data, meta: payload.meta };
}

export const api = {
  get: (path, query, options) => request('GET', path, { query, ...options }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
};

// Helper for services that only need the data part
export const data = (promise) => promise.then((r) => r.data);
