import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/auth.service';
import { ROLES, BRANCHES } from '../config/constants';

export const AuthContext = createContext(null);

// Module-level variable: survives React 18/19 StrictMode double remount
let initialAuthPromise = null;
let initialAuthController = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aeterna_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state (resilient to StrictMode double mount)
  useEffect(() => {
    let cancelled = false;

    if (!initialAuthPromise) {
      initialAuthController = new AbortController();
      initialAuthPromise = authService
        .getCurrentUser({ signal: initialAuthController.signal })
        .catch(() => null);
    }

    initialAuthPromise.then((res) => {
      if (cancelled) return;
      if (res && res.user) {
        setUser(res.user);
        try {
          localStorage.setItem('aeterna_user', JSON.stringify(res.user));
        } catch {
          // ignore storage error
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('aeterna_user');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Login handler
  const login = useCallback(async (credentials) => {
    // Abort initial session check if still in-flight
    initialAuthController?.abort();

    const res = await authService.login(credentials);
    const authenticatedUser = res.user;
    const authToken = res.token;

    setUser(authenticatedUser);
    setToken(authToken);

    if (authenticatedUser) {
      localStorage.setItem('aeterna_user', JSON.stringify(authenticatedUser));
    }

    return authenticatedUser;
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('aeterna_user');
      initialAuthPromise = null;
    }
  }, []);

  // Helper: check if user has one of the allowed roles
  const hasRole = useCallback(
    (...allowedRoles) => {
      if (!user) return false;
      const flatRoles = allowedRoles.flat();
      return flatRoles.includes(user.role);
    },
    [user]
  );

  // Helper: check if user has access to a specific branch
  const hasBranch = useCallback(
    (branch) => {
      if (!user) return false;
      if (user.role === ROLES.SUPER_ADMIN || user.branch === BRANCHES.ALL) return true;
      return user.branch === branch;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      hasRole,
      hasBranch,
    }),
    [user, token, loading, login, logout, hasRole, hasBranch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { useAuth } from './useAuth';
