import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthRepository } from '../repositories/auth.repository';
import { setToken, clearToken, getToken } from '../api/client';
import type { UserProfile, LoginDto } from '../api/types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
}

interface AuthContextType extends AuthState {
  login: (dto: LoginDto) => Promise<{ requires2FA?: boolean }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    requires2FA: false,
  });

  const refreshProfile = useCallback(async () => {
    try {
      const user = await AuthRepository.getProfile();
      setState({ user, isAuthenticated: true, isLoading: false, requires2FA: false });
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false, requires2FA: false });
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      refreshProfile();
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [refreshProfile]);

  const login = async (dto: LoginDto) => {
    const res = await AuthRepository.login(dto);
    if (res.requires2FA) {
      setState(s => ({ ...s, requires2FA: true }));
      return { requires2FA: true };
    }
    if (res.access_token) {
      setToken(res.access_token);
      await refreshProfile();
    }
    return {};
  };

  const logout = () => {
    clearToken();
    setState({ user: null, isAuthenticated: false, isLoading: false, requires2FA: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
