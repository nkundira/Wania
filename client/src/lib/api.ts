import axios, { AxiosError } from 'axios';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

const bare = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const sessionExpiredEvent = 'wania:session-expired';

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function doRefresh(): Promise<string | null> {
  try {
    const { data } = await bare.post('/auth/refresh');
    accessToken = data.accessToken;
    window.dispatchEvent(new CustomEvent('wania:session-refreshed', { detail: data }));
    return data.accessToken;
  } catch {
    accessToken = null;
    window.dispatchEvent(new Event(sessionExpiredEvent));
    return null;
  }
}

export function refreshAccessToken() {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url ?? '';
    if (status === 401 && config && !config._retry && !url.includes('/auth/')) {
      config._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api.request(config);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string; code?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the WANIA server. Check your connection.';
    if (error.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function getErrorCode(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
  }
  return undefined;
}

export function assetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  if (API_BASE.startsWith('http')) {
    try {
      return new URL(API_BASE).origin + url;
    } catch {
      return url;
    }
  }
  const server = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (server) return server.replace(/\/$/, '') + url;
  return url;
}

export function socketBaseUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit) return explicit;
  if (API_BASE.startsWith('http')) {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
}
