/**
 * Auth 业务封装: 登录/注册/获取当前用户
 */
import { api, clearToken, getToken, setToken } from './api';
import type { CurrentUser, LoginRequest, RegisterRequest, TokenResponse } from './types';

export const authApi = {
  async register(data: RegisterRequest): Promise<TokenResponse> {
    const resp = await api.post<TokenResponse>('/auth/register', data);
    setToken(resp.data.access_token);
    return resp.data;
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const resp = await api.post<TokenResponse>('/auth/login', data);
    setToken(resp.data.access_token);
    return resp.data;
  },

  async me(): Promise<CurrentUser> {
    const resp = await api.get<CurrentUser>('/auth/me');
    return resp.data;
  },

  logout() {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },

  isLoggedIn(): boolean {
    return !!getToken();
  },
};
