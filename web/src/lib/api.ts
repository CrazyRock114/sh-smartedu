/**
 * Axios 客户端: 自动带 Bearer token, 401 自动跳登录
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'xueji_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
};

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截: 自动带 token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截: 401 自动清 token + 跳登录
api.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearToken();
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login?next=' + encodeURIComponent(window.location.pathname);
      }
    }
    return Promise.reject(error);
  }
);

// 统一错误信息提取
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; detail?: { message?: string } | string } | undefined;
    if (data?.message) return data.message;
    if (typeof data?.detail === 'string') return data.detail;
    if (data?.detail && typeof data.detail === 'object' && 'message' in data.detail) {
      return (data.detail as { message: string }).message;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return '未知错误';
}
