/**
 * 学情分析 API
 */
import { api } from './api';
import type { SuccessResponse, WeeklyReportResponse } from './types';

// Dashboard 数据结构
export interface SubjectDashboard {
  subject: string;
  label: string;
  total: number;
  new: number;
  reviewing: number;
  mastered: number;
  by_error_type: Record<string, number>;
  mastery_score: number;
}

export interface DashboardData {
  child: { id: string; name: string; grade: number };
  subjects: SubjectDashboard[];
  weak_points: { code: string; error_count: number }[];
  today_due: number;
  recent_7d: {
    new_errors: number;
    reviewed: number;
    mastered: number;
    active_days: number;
  };
  last_updated: string;
}

export interface HeatmapCell {
  date: string;
  by_subject: Record<string, number>;
  total: number;
}

export interface HeatmapData {
  days: number;
  start_date: string;
  end_date: string;
  cells: HeatmapCell[];
  max_per_day: number;
}

export const analyticsApi = {
  async dashboard(childId: string): Promise<DashboardData> {
    const resp = await api.get<SuccessResponse<DashboardData>>('/analytics/dashboard', {
      params: { child_id: childId },
    });
    return resp.data.data;
  },

  async heatmap(childId: string, days = 30): Promise<HeatmapData> {
    const resp = await api.get<SuccessResponse<HeatmapData>>('/analytics/heatmap', {
      params: { child_id: childId, days },
    });
    return resp.data.data;
  },

  async weeklyReport(childId?: string, weekStart?: string): Promise<WeeklyReportResponse> {
    const resp = await api.get<SuccessResponse<WeeklyReportResponse>>(
      '/analytics/weekly-report',
      { params: { child_id: childId, week_start: weekStart } }
    );
    return resp.data.data;
  },
};
