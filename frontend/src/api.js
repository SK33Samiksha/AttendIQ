// Every call to the backend goes through apiFetch().
// The React app and the API are served from the same address, so '/api' works on
// localhost, from a phone on the same Wi-Fi, and when deployed.
const API = '/api';

export function getToken() {
  return localStorage.getItem('token');
}

// AuthContext registers a function here so that a 401 (not signed in / session
// expired / account disabled) signs the user out wherever it happens.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * apiFetch('/students')                                  -> GET
 * apiFetch('/students', { method: 'POST', body: {...} }) -> body is sent as JSON
 * Always resolves to the server's JSON: { success, data?, message? }
 */
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { success: false, message: 'Cannot reach the server. Is the backend running?' };
  }

  const data = await res
    .json()
    .catch(() => ({ success: false, message: `Request failed (${res.status}).` }));

  // 401 = not signed in. (403 only means "not allowed", so the user stays signed in.)
  if (res.status === 401 && token) onUnauthorized(data.message);
  return data;
}
