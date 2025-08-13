import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/api';

type AuthUser = { id: string; email: string; username: string; avatar?: string } | null;

type AuthContextValue = {
  user: AuthUser;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = 'cosnap_access_token';
const REFRESH_KEY = 'cosnap_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const saveTokens = (access?: string, refresh?: string) => {
    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
      setAccessToken(access);
    }
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  };

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
  };

  const fetchMe = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user as AuthUser;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(ACCESS_KEY);
      if (stored) {
        setAccessToken(stored);
        const me = await fetchMe(stored);
        if (me) setUser(me);
        else {
          // 尝试刷新一次
          const ok = await refresh();
          if (!ok) clearTokens();
        }
      }
      setBootstrapped(true);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const refresh = async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens(data.accessToken);
      if (!user) {
        const me = await fetchMe(data.accessToken);
        if (me) setUser(me);
      }
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
    login,
    register,
    logout,
    refresh,
  }), [user, accessToken]);

  if (!bootstrapped) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


