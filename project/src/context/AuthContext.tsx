import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

type AuthUser = { id: string; email: string; username: string; avatar?: string } | null;

type AuthContextValue = {
  user: AuthUser;
  isAuthenticated: boolean;
  accessToken: string | null;
  bootstrapped: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string, code?: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<boolean>;
  requestRegisterCode: (email: string) => Promise<boolean>;
  updateUserData: (updates: Partial<AuthUser>) => void;
  refreshUserData: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = 'cosnap_access_token';
const REFRESH_KEY = 'cosnap_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  
  // FIXED: Implemented mutex mechanism for token refresh concurrency control
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const refreshMutexRef = useRef<boolean>(false);

  const saveTokens = useCallback((access?: string, refresh?: string) => {
    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
      setAccessToken(access);
    }
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
  }, []);

  const fetchMe = useCallback(async (token: string) => {
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
  }, []);

  const refresh = useCallback(async () => {
    // If already refreshing, return the existing promise
    if (refreshMutexRef.current) {
      return refreshPromiseRef.current || Promise.resolve(false);
    }
    refreshMutexRef.current = true;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      refreshMutexRef.current = false; // 释放锁
      return false;
    }
    
    setIsRefreshing(true);
    if (refreshPromiseRef.current) {
      refreshMutexRef.current = false; // 释放锁
      return refreshPromiseRef.current;
    }
    refreshPromiseRef.current = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            clearTokens(); // Force re-login on invalid refresh token
            setUser(null);
          }
          return false;
        }
        
        const data = await res.json();
        saveTokens(data.accessToken);
        
        // Update user data with refreshed token
        const me = await fetchMe(data.accessToken);
        if (me) setUser(me);
        
        return true;
      } catch (error) {
        console.error('Token refresh error:', error);
        clearTokens(); // Ensure cleanup on failure
        setUser(null);
        return false;
      } finally {
        setIsRefreshing(false);
        refreshPromiseRef.current = null;
        refreshMutexRef.current = false; // 释放互斥锁

      }
    })();
    
    return refreshPromiseRef.current;
  }, [saveTokens, clearTokens, fetchMe, isRefreshing]);

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(ACCESS_KEY);
      if (stored) {
        setAccessToken(stored);
        const me = await fetchMe(stored);
        if (me) setUser(me);
        else {
          // Try to refresh once
          const ok = await refresh();
          if (!ok) clearTokens();
        }
      }
      setBootstrapped(true);
    })();
  }, [fetchMe, refresh, clearTokens]);

  const login = useCallback(async (email: string, password: string) => {
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
  }, [saveTokens]);

  const register = useCallback(async (email: string, username: string, password: string, code?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, code })
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, [saveTokens]);

  const requestRegisterCode = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, scene: 'register' })
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);


  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, [clearTokens]);

  const updateUserData = useCallback((updates: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    }
  }, [user]);

  const refreshUserData = useCallback(async () => {
    if (!accessToken) return false;
    try {
      const updatedUser = await fetchMe(accessToken);
      if (updatedUser) {
        setUser(updatedUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return false;
    }
  }, [accessToken, fetchMe]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
    bootstrapped,
    login,
    register,
    logout,
    refresh,
    requestRegisterCode,
    updateUserData,
    refreshUserData,
  }), [user, accessToken, bootstrapped, login, register, logout, refresh, requestRegisterCode, updateUserData, refreshUserData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


