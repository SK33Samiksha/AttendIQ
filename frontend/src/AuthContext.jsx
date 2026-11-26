import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setUnauthorizedHandler } from './api';

// Holds the signed-in user for the whole app.
// Any component can call useAuth() to get { user, isAdmin, login, logout }.
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user')) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null); // the route guards then send the user to the sign-in page
  }, []);

  // If the server says "not signed in" on any request, sign out here too.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Returns null on success, or an error message to show on the form.
  const login = useCallback(async (email, password) => {
    const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    if (!res.success) return res.message || 'Login failed.';
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return null;
  }, []);

  const value = { user, isAdmin: user?.role === 'admin', login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
