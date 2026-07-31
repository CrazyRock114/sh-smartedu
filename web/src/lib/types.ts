/**
 * API 类型 (与后端 Pydantic schema 对应)
 */

export type Subject =
  | 'math'
  | 'chinese'
  | 'english'
  | 'science'
  | 'moral'
  | 'pe'
  | 'art';

export interface SubjectTextbookVersion {
  subject: Subject;
  version: string;
}

// === 通用响应 ===
export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// === Auth ===
export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
  invite_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  family_id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  is_new_user: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  push_enabled: boolean;
  push_time: string;
  daily_limit_minutes: number;
  lock_at_night: boolean;
  lock_time: string;
  child_count: number;
}

// === Child ===
export interface Child {
  id: string;
  name: string;
  grade: number;
  avatar: string | null;
  textbook_versions: SubjectTextbookVersion[];
}

export interface ChildCreate {
  name: string;
  grade: number;
  class_name?: string;
  school_name?: string;
  textbook_versions: SubjectTextbookVersion[];
  avatar?: string;
}

export interface ChildUpdate {
  name?: string;
  grade?: number;
  class_name?: string;
  school_name?: string;
  textbook_versions?: SubjectTextbookVersion[];
  avatar?: string;
}

export const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
  { value: 'moral', label: '道德与法治' },
  { value: 'pe', label: '体育' },
  { value: 'art', label: '美术' },
];

export const TEXTBOOK_VERSIONS: Record<Subject, string[]> = {
  math: ['沪教版', '人教版', '北师大版', '苏教版'],
  chinese: ['统编版'],
  english: ['人教PEP版', '沪教版', '牛津上海版', '译林版'],
  science: [],
  moral: ['统编版'],
  pe: [],
  art: [],
};

export const GRADES = [1, 2, 3, 4, 5, 6] as const;
export type Grade = (typeof GRADES)[number];

// === 错因 (7 类) ===
export const ERROR_TYPES = [
  'CARELESS',
  'READING_WRONG',
  'METHOD_WRONG',
  'CONCEPT_CONFUSE',
  'KNOWLEDGE_GAP',
  'TIME_PRESSURE',
  'OTHER',
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  CARELESS: '粗心/计算错',
  READING_WRONG: '审题错',
  METHOD_WRONG: '方法错',
  CONCEPT_CONFUSE: '概念混',
  KNOWLEDGE_GAP: '知识缺失',
  TIME_PRESSURE: '速度慢',
  OTHER: '其他',
};

// === Error Item ===
export interface ErrorItem {
  id: string;
  child_id: string;
  subject: string;
  knowledge_point_ids: string[];
  question_text: string;
  question_image_url: string | null;
  correct_answer: string;
  student_answer: string;
  error_type: ErrorType;
  error_note: string | null;
  source: string;
  source_note: string | null;
  status: 'new' | 'reviewing' | 'mastered' | 'archived';
  next_review_at: string | null;
  review_count: number;
  last_reviewed_at: string | null;
  last_review_correct: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorItemListItem {
  id: string;
  child_id: string;
  subject: string;
  error_type: ErrorType;
  status: ErrorItem['status'];
  next_review_at: string | null;
  review_count: number;
  question_preview: string;
  created_at: string;
}

export interface ReviewQueueItem {
  id: string;
  child_id: string;
  subject: string;
  question_text: string;
  question_image_url: string | null;
  correct_answer: string;
  student_answer: string;
  error_type: ErrorType;
  next_review_at: string | null;
  review_count: number;
  is_overdue: boolean;
}

export interface ErrorItemCreate {
  subject: string;
  knowledge_point_ids?: string[];
  question_text: string;
  question_image_url?: string;
  correct_answer: string;
  student_answer: string;
  error_type: ErrorType;
  error_note?: string;
  source?: string;
  source_note?: string;
}

export interface ErrorItemUpdate {
  knowledge_point_ids?: string[];
  error_type?: ErrorType;
  error_note?: string;
  correct_answer?: string;
  student_answer?: string;
}

export interface ErrorStats {
  total: number;
  by_subject: Record<string, number>;
  by_error_type: Record<string, number>;
  by_status: Record<string, number>;
  due_today: number;
  mastered_this_week: number;
}

export interface SuggestRequest {
  question: string;
  correct_answer: string;
  student_answer: string;
  note?: string;
}

export interface SuggestResponse {
  error_type: ErrorType;
  reason: string;
  source: 'glm' | 'rule';
  labels: Record<string, string>;
}

export interface OcrExtractResponse {
  question_text: string;
  student_answer: string;
  error_type: ErrorType;
  reason: string;
  source: 'glm-4v';
  labels: Record<string, string>;
}

export const ERROR_STATUS_LABELS: Record<ErrorItem['status'], string> = {
  new: '待复习',
  reviewing: '复习中',
  mastered: '已掌握',
  archived: '已归档',
};

// === 学情 / 周报 ===
export interface WeeklyReportResponse {
  week_start: string;
  week_end: string;
  total_new_errors: number;
  total_reviewed: number;
  total_mastered: number;
  highlights: string[];
  next_week_focus: string[];
  by_subject: Record<
    string,
    { new_errors: number; reviewed: number; mastered: number; mastery_score: number }
  >;
}

// === Push 偏好 + 锁屏 ===
export const SUBJECT_LABELS: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  science: '科学',
  moral: '道德与法治',
  pe: '体育',
  art: '美术',
};
