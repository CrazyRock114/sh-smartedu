/**
 * 推送 + 锁屏 API
 */
import { api } from './api';
import type { SuccessResponse } from './types';

export interface PushPreference {
  push_enabled: boolean;
  push_time: string;
  daily_limit_minutes: number;
  lock_at_night: boolean;
  lock_time: string;
}

export interface PushRecord {
  id: string;
  family_id: string;
  child_id: string | null;
  push_type: string;
  content_summary: string;
  sent_at: string;
  opened_at: string | null;
  push_channel: string;
}

export interface LockStatus {
  lock_at_night: boolean;
  lock_time: string;
  used_minutes: number;
  limit_minutes: number;
  is_locked: boolean;
  lock_reason: string | null;
}

export const pushApi = {
  async getPreferences(): Promise<PushPreference> {
    const resp = await api.get<SuccessResponse<PushPreference>>('/push/preferences');
    return resp.data.data;
  },

  async updatePreferences(p: Partial<PushPreference>): Promise<PushPreference> {
    const resp = await api.patch<SuccessResponse<PushPreference>>('/push/preferences', p);
    return resp.data.data;
  },

  async listRecords(unreadOnly = false, limit = 50): Promise<PushRecord[]> {
    const resp = await api.get<SuccessResponse<PushRecord[]>>('/push/records', {
      params: { unread_only: unreadOnly, limit },
    });
    return resp.data.data;
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/push/records/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.post('/push/records/read-all');
  },

  async lockStatus(): Promise<LockStatus> {
    const resp = await api.get<SuccessResponse<LockStatus>>('/push/lock-status');
    return resp.data.data;
  },
};
