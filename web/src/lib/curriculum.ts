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

export interface VideoItem {
  id: string;
  episode: string;
  teacher: string | null;
  school: string | null;
  duration: string | null;
  description: string | null;
  direct_url: string | null;
  search_url: string | null;
  chapter_listing_url: string | null;
  importance: number;
  week_index: number | null;
}

export interface ChapterWeekly {
  chapter: string;
  name: string;
  week_index: number;
  knowledge_point_count: number;
  knowledge_point_codes: string[];
  videos: VideoItem[];
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
  weekly_videos: VideoItem[];
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

  /**
   * 真实微课 (从 basic.sh.smartedu.cn API 抓的, 含 resource_id + courseId)
   * 用于 hero "本周推荐", 跳转到 airClassroomTaskDetail 直达视频播放器
   */
  async realVideos(opts: {
    grade: number;
    subject: string;
    version: string;
    semester: string;
    limit?: number;
  }): Promise<RealVideoItem[]> {
    const resp = await api.get<SuccessResponse<{ items: RealVideoItem[]; total: number }>>(
      '/smartedu-videos',
      { params: { ...opts, limit: opts.limit ?? 10 } }
    );
    return resp.data.data.items;
  },
};

/** 真实微课 item (来自 basic.sh.smartedu.cn) */
export interface RealVideoItem {
  id: string;
  grade: number;
  subject: string;
  subject_label: string;
  version: string;
  version_label: string;
  semester: string;
  term_label: string;
  resource_id: string;
  subject_id: string;
  title: string;
  school: string | null;
  teacher: string | null;
  upload_file_name: string | null;
  release_time: string | null;
  video_url: string | null;
  direct_url: string;
  importance: number;
  verified: boolean;
}
