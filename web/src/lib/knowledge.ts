/**
 * 知识图谱 API
 */
import { api } from './api';
import type { SuccessResponse } from './types';

export interface KnowledgePoint {
  code: string;
  subject: string;
  grade: number;
  chapter: string;
  name: string;
  importance: number;
  difficulty: number;
}

export interface KnowledgePointDetail extends KnowledgePoint {
  id: string;
  description: string | null;
  prerequisites: string[];
  successors: string[];
  related: string[];
  video_urls: string[];
  common_errors: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  code: string;
  name: string;
  chapter: string;
  importance: number;
  difficulty: number;
  mastery: number;
  error_count: number;
  has_video: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'prerequisite' | 'successor' | 'related';
}

export interface KnowledgeGraphData {
  subject: string;
  grade: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total: number;
    mastered: number;
    in_progress: number;
    unstudied: number;
    weak: number;
  };
}

export interface ChapterInfo {
  chapter: string;
  knowledge_points: KnowledgePoint[];
  total_points: number;
}

export const knowledgeApi = {
  async listPoints(opts: { subject?: string; grade?: number; chapter?: string } = {}): Promise<KnowledgePoint[]> {
    const resp = await api.get<SuccessResponse<KnowledgePoint[]>>('/knowledge/points', {
      params: opts,
    });
    return resp.data.data;
  },

  async getPoint(code: string): Promise<KnowledgePointDetail> {
    const resp = await api.get<SuccessResponse<KnowledgePointDetail>>(`/knowledge/points/${code}`);
    return resp.data.data;
  },

  async graph(opts: { subject: string; grade: number; childId?: string }): Promise<KnowledgeGraphData> {
    const resp = await api.get<SuccessResponse<KnowledgeGraphData>>('/knowledge/graph', {
      params: {
        subject: opts.subject,
        grade: opts.grade,
        child_id: opts.childId,
      },
    });
    return resp.data.data;
  },

  async chapters(opts: { subject: string; grade: number }): Promise<ChapterInfo[]> {
    const resp = await api.get<SuccessResponse<ChapterInfo[]>>('/knowledge/chapters', {
      params: opts,
    });
    return resp.data.data;
  },
};
