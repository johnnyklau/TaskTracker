import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { login as apiLogin, signup as apiSignup, type User } from '../api/auth';
import {
  loadStoredAuth,
  saveStoredAuth,
  clearStoredAuth,
} from '../api/authStorage';
import { API_URL } from '../api/tasks';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, accessToken, refreshToken }, setAuth] =
    useState(loadStoredAuth);
  const queryClient = useQueryClient();

  function persistAuth(user: User, accessToken: string, refreshToken: string) {
    saveStoredAuth({ user, accessToken, refreshToken });
    setAuth({ user, accessToken, refreshToken });
  }

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    persistAuth(result.user, result.accessToken, result.refreshToken);
  }

  async function signup(email: string, password: string) {
    const result = await apiSignup(email, password);
    persistAuth(result.user, result.accessToken, result.refreshToken);
  }

  async function logout() {
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Best-effort
      }
    }
    clearStoredAuth();
    setAuth({ user: null, accessToken: null, refreshToken: null });
    queryClient.clear();
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, refreshToken, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
