import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getErrorMessage, sessionExpiredEvent, setAccessToken } from '../lib/api';
import { aiApi, authApi } from '../services/wania';
import type { OnboardingProgress, Profile } from '../types';
import { useToast } from './ToastContext';

type AuthContextValue = {
  user: Profile | null;
  onboarding: OnboardingProgress | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: Profile) => void;
  setOnboarding: (progress: OnboardingProgress) => void;
  updateProgress: (body: Partial<OnboardingProgress>) => Promise<OnboardingProgress>;
  restartTour: () => Promise<OnboardingProgress>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const applyAuth = useCallback((nextToken: string, nextUser: Profile, progress?: OnboardingProgress) => {
    setAccessToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    if (progress) setOnboarding(progress);
  }, []);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setOnboarding(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        if (cancelled) return;
        applyAuth(data.accessToken, data.user, data.onboarding);
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyAuth, clearAuth]);

  useEffect(() => {
    const handler = () => {
      clearAuth();
      setLoading(false);
    };
    window.addEventListener(sessionExpiredEvent, handler);
    return () => window.removeEventListener(sessionExpiredEvent, handler);
  }, [clearAuth]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await authApi.login({ identifier, password });
      applyAuth(data.accessToken, data.user, data.onboarding);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (input: { username: string; email: string; password: string; displayName: string }) => {
      const data = await authApi.register(input);
      applyAuth(data.accessToken, data.user, data.onboarding);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared even if the network request fails.
    }
    clearAuth();
  }, [clearAuth]);

  const refreshMe = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setOnboarding(data.onboarding);
    } catch (err) {
      error(getErrorMessage(err));
    }
  }, [error]);

  const updateProgress = useCallback(async (body: Partial<OnboardingProgress>) => {
    const progress = await aiApi.updateProgress(body);
    setOnboarding(progress);
    return progress;
  }, []);

  const restartTour = useCallback(async () => {
    const progress = await aiApi.restartOnboarding();
    setOnboarding(progress);
    return progress;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      onboarding,
      token,
      loading,
      login,
      register,
      logout,
      refreshMe,
      setUser,
      setOnboarding,
      updateProgress,
      restartTour,
    }),
    [user, onboarding, token, loading, login, register, logout, refreshMe, updateProgress, restartTour]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
