import { handleMockRequest } from "./mockBackend";

const BASE = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = "pd_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, path, body) {
  // If no backend URL configured, use integrated mock backend directly
  if (!BASE) {
    return handleMockRequest(method, path, body);
  }

  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && path !== "/auth/login") {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }

    const text = await res.text();
    // If response is HTML (e.g. 404 rewrite or backend error), fallback to mock
    if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
      console.warn("Backend returned HTML instead of JSON. Falling back to demo mock store.");
      return handleMockRequest(method, path, body);
    }

    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    // If backend is unreachable or CORS blocked, fall back to mock
    console.warn(`API call failed (${err.message}). Using local demo store.`);
    return handleMockRequest(method, path, body);
  }
}

function safeJson(t) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),
};
