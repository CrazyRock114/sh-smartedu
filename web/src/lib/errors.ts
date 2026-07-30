/**
 * 错题本 API
 */
import { api } from './api';
import type {
  ErrorItem,
  ErrorItemCreate,
  ErrorItemListItem,
  ErrorItemUpdate,
  ErrorStats,
  ReviewQueueItem,
  SuggestRequest,
  SuggestResponse,
  SuccessResponse,
} from './types';

export const errorsApi = {
  // 列表
  async list(
    childId: string,
    opts: {
      subject?: string;
      errorType?: string;
      status?: string;
      includeArchived?: boolean;
      limit?: number;
    } = {}
  ): Promise<ErrorItemListItem[]> {
    const resp = await api.get<SuccessResponse<ErrorItemListItem[]>>('/errors', {
      params: {
        child_id: childId,
        subject: opts.subject,
        error_type: opts.errorType,
        status: opts.status,
        include_archived: opts.includeArchived,
        limit: opts.limit ?? 50,
      },
    });
    return resp.data.data;
  },

  // 详情
  async get(errorId: string, childId: string): Promise<ErrorItem> {
    const resp = await api.get<SuccessResponse<ErrorItem>>(`/errors/${errorId}`, {
      params: { child_id: childId },
    });
    return resp.data.data;
  },

  // 录入
  async create(childId: string, data: ErrorItemCreate): Promise<ErrorItem> {
    const resp = await api.post<SuccessResponse<ErrorItem>>('/errors', data, {
      params: { child_id: childId },
    });
    return resp.data.data;
  },

  // 更新
  async update(errorId: string, childId: string, data: ErrorItemUpdate): Promise<ErrorItem> {
    const resp = await api.patch<SuccessResponse<ErrorItem>>(`/errors/${errorId}`, data, {
      params: { child_id: childId },
    });
    return resp.data.data;
  },

  // 删除
  async delete(errorId: string, childId: string): Promise<void> {
    await api.delete(`/errors/${errorId}`, { params: { child_id: childId } });
  },

  // 复习队列
  async reviewQueue(childId: string, limit = 10): Promise<ReviewQueueItem[]> {
    const resp = await api.get<SuccessResponse<ReviewQueueItem[]>>('/errors/review-queue', {
      params: { child_id: childId, limit },
    });
    return resp.data.data;
  },

  // 提交复习
  async submitReview(
    errorId: string,
    childId: string,
    result: 'correct' | 'wrong' | 'skip'
  ): Promise<ErrorItem> {
    const resp = await api.post<SuccessResponse<ErrorItem>>(
      `/errors/${errorId}/review`,
      null,
      { params: { child_id: childId, result } }
    );
    return resp.data.data;
  },

  // 统计
  async stats(childId: string): Promise<ErrorStats> {
    const resp = await api.get<SuccessResponse<ErrorStats>>('/errors/stats', {
      params: { child_id: childId },
    });
    return resp.data.data;
  },

  // 归因建议 (录入前调用, 不写库)
  async suggest(data: SuggestRequest): Promise<SuggestResponse> {
    const resp = await api.post<SuccessResponse<SuggestResponse>>('/errors/suggest-type', data);
    return resp.data.data;
  },
};
