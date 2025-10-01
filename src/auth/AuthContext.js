import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => localStorage.getItem('auth_role') || null);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('auth_user', JSON.stringify(user));
      else localStorage.removeItem('auth_user');
      if (role) localStorage.setItem('auth_role', role);
      else localStorage.removeItem('auth_role');
    } catch {
      // ignore storage failures
    }
  }, [user, role]);

  const login = async ({ email, password, role: loginRole = 'user' }) => {
    // Mock login (replace with real API later)
    if (!email || !password) throw new Error('Email and password are required');
    setUser({ email });
    setRole(loginRole);
    return { email, role: loginRole };
  };

  const register = async ({ email, password, name, role: regRole = 'user' }) => {
    if (!email || !password) throw new Error('All fields are required');
    // Mock register -> auto-login
    setUser({ email, name: name || email.split('@')[0] });
    setRole(regRole);
    return { email, role: regRole };
  };

  const logout = () => {
    setUser(null);
    setRole(null);
  };

  const value = useMemo(() => ({
    user,
    role,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    login,
    register,
    logout,
  }), [user, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
