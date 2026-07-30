/**
 * 孩子管理 API
 */
import { api } from './api';
import type { Child, ChildCreate, ChildUpdate, SuccessResponse } from './types';

export const childrenApi = {
  async list(includeArchived = false): Promise<Child[]> {
    const resp = await api.get<SuccessResponse<Child[]>>('/children', {
      params: { include_archived: includeArchived },
    });
    return resp.data.data;
  },

  async create(data: ChildCreate): Promise<Child> {
    const resp = await api.post<SuccessResponse<Child>>('/children', data);
    return resp.data.data;
  },

  async get(id: string): Promise<Child> {
    const resp = await api.get<SuccessResponse<Child>>(`/children/${id}`);
    return resp.data.data;
  },

  async update(id: string, data: ChildUpdate): Promise<Child> {
    const resp = await api.patch<SuccessResponse<Child>>(`/children/${id}`, data);
    return resp.data.data;
  },

  async archive(id: string): Promise<void> {
    await api.delete(`/children/${id}`);
  },
};
