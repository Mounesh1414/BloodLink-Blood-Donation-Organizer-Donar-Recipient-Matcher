const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
