/**
 * 教材 API
 */
import { api } from './api';
import type { SuccessResponse } from './types';

export interface CurriculumChangeItem {
  chapter: string;
  type: 'new' | 'adjusted' | 'removed' | 'renamed';
  summary: string;
  key_points: string[];
}

export interface CurriculumChange {
  id: number;
  grade: number;
  subject: string;
  version: string;
  semester: string;
  changes: CurriculumChangeItem[];
  source: string;
  source_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurriculumChangeListItem {
  id: number;
  grade: number;
  subject: string;
  version: string;
  semester: string;
  change_count: number;
  verified: boolean;
}

export interface ChapterWeekly {
  chapter: string;
  name: string;
  week_index: number;
  knowledge_point_count: number;
  knowledge_point_codes: string[];
  video_url: string | null;
  note: string | null;
}

export interface WeeklyChaptersData {
  grade: number;
  subject: string;
  version: string;
  semester: string;
  week_index: number;
  chapters: ChapterWeekly[];
  is_new_textbook: boolean;
  change_notice: string | null;
}

export interface ChapterListData {
  grade: number;
  subject: string;
  version: string;
  semester: string;
  chapters: string[];
  new_textbook_chapters: string[];
}

export const curriculumApi = {
  async listChanges(opts: {
    grade?: number;
    subject?: string;
    version?: string;
    verifiedOnly?: boolean;
  } = {}): Promise<CurriculumChangeListItem[]> {
    const resp = await api.get<SuccessResponse<CurriculumChangeListItem[]>>(
      '/curriculum/changes',
      { params: opts }
    );
    return resp.data.data;
  },

  async getChange(id: number): Promise<CurriculumChange> {
    const resp = await api.get<SuccessResponse<CurriculumChange>>(
      `/curriculum/changes/${id}`
    );
    return resp.data.data;
  },

  async listChapters(opts: {
    grade: number;
    subject: string;
    version: string;
    semester?: string;
  }): Promise<ChapterListData> {
    const resp = await api.get<SuccessResponse<ChapterListData>>(
      '/curriculum/chapters',
      { params: opts }
    );
    return resp.data.data;
  },

  async weekly(opts: {
    grade: number;
    subject: string;
    version: string;
    semester: string;
  }): Promise<WeeklyChaptersData> {
    const resp = await api.get<SuccessResponse<WeeklyChaptersData>>(
      '/curriculum/weekly',
      { params: opts }
    );
    return resp.data.data;
  },
};
