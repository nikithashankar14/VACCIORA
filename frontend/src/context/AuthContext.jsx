/**
 * AuthContext.jsx
 * Global authentication state, session persistence, and forced password change handling.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vacciora_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vacciora_token') || null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.user) {
            setUser(res.user);
            setRequirePasswordChange(Boolean(res.user.requirePasswordChange));
            localStorage.setItem('vacciora_user', JSON.stringify(res.user));
          }
        } catch (err) {
          if (err.code === 'PASSWORD_CHANGE_REQUIRED') {
            setRequirePasswordChange(true);
          } else {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await authApi.login(identifier, password);
    localStorage.setItem('vacciora_token', res.token);
    localStorage.setItem('vacciora_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setRequirePasswordChange(Boolean(res.requirePasswordChange));
    return res;
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    localStorage.setItem('vacciora_token', res.token);
    localStorage.setItem('vacciora_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setRequirePasswordChange(false);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('vacciora_token');
    localStorage.removeItem('vacciora_user');
    setToken(null);
    setUser(null);
    setRequirePasswordChange(false);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    if (res.token) {
      localStorage.setItem('vacciora_token', res.token);
      setToken(res.token);
    }
    setRequirePasswordChange(false);
    if (user) {
      const updated = { ...user, requirePasswordChange: false };
      setUser(updated);
      localStorage.setItem('vacciora_user', JSON.stringify(updated));
    }
    return res;
  };

  const value = {
    user,
    token,
    loading,
    requirePasswordChange,
    login,
    register,
    logout,
    changePassword,
    isParent: user?.role === 'parent',
    isStaff: user?.role === 'staff',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
