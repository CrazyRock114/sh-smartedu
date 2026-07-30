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
