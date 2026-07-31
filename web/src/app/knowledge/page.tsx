'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Network, Loader2, AlertCircle, Brain, X, ExternalLink } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { knowledgeApi, type GraphNode, type KnowledgeGraphData } from '@/lib/knowledge';
import type { Child } from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/NavBar';

const SUBJECTS = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
];

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  mastered: { bg: '#d1fae5', border: '#10b981', text: '#065f46', label: '已掌握' },
  in_progress_strong: { bg: '#fed7aa', border: '#f97316', text: '#7c2d12', label: '在学' },
  in_progress_weak: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d', label: '薄弱' },
  unstudied: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: '未学' },
};

function classifyMastery(node: GraphNode): keyof typeof NODE_COLORS {
  if (node.error_count === 0) return 'unstudied';
  if (node.mastery >= 0.8) return 'mastered';
  if (node.mastery >= 0.5) return 'in_progress_strong';
  return 'in_progress_weak';
}

export default function KnowledgePage() {
  const router = useRouter();

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [subject, setSubject] = useState('math');
  const [grade, setGrade] = useState(3);
  const [graph, setGraph] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showChapters, setShowChapters] = useState(true);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/knowledge');
      return;
    }
    childrenApi
      .list()
      .then((cs) => {
        setChildren(cs);
        if (cs.length > 0) {
          setChildId(cs[0].id);
          setGrade(cs[0].grade);
        }
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [router]);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    knowledgeApi
      .graph({ subject, grade, childId })
      .then((g) => {
        setGraph(g);
        setSelectedNode(null);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [subject, grade, childId]);

  const { positions, chapters } = useMemo(() => {
    if (!graph) return { positions: new Map<string, { x: number; y: number; chapter: string }>(), chapters: [] as string[] };
    const by_chapter: Record<string, GraphNode[]> = {};
    for (const n of graph.nodes) (by_chapter[n.chapter] ||= []).push(n);
    const chList = Object.keys(by_chapter).sort();
    const pos = new Map<string, { x: number; y: number; chapter: string }>();
    chList.forEach((ch, ci) => {
      by_chapter[ch].forEach((n, ni) => {
        pos.set(n.code, { x: ci, y: ni, chapter: ch });
      });
    });
    return { positions: pos, chapters: chList };
  }, [graph]);

  const COL_W = 180;
  const COL_GAP = 50;
  const ROW_H = 64;
  const PAD = 30;
  const W = Math.max(chapters.length * (COL_W + COL_GAP) + PAD * 2, 600);
  const maxRows = Math.max(1, ...Array.from(positions.values()).map((p) => p.y));
  const svgH = (maxRows + 2) * ROW_H + PAD * 2;

  if (loading && !graph) return <Loading label="加载图谱…" />;

  return (
    <div>
      <PageHeader
        icon={<Network className="h-5 w-5" />}
        title="知识图谱"
        subtitle="颜色编码孩子当前掌握度 · 点击节点查看详情"
      />

      {/* 控制条 */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">学科</span>
            <div className="flex gap-1">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSubject(s.value)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    subject === s.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">年级</span>
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value, 10))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-primary-400"
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  {g} 年级
                </option>
              ))}
            </select>
          </div>

          {children.length > 1 && childId && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">孩子</span>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-primary-400"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowChapters(!showChapters)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700"
          >
            {showChapters ? '隐藏章节标签' : '显示章节标签'}
          </button>
        </div>
      </div>

      {/* 图例 + summary */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="font-medium text-slate-500">图例:</span>
        {Object.entries(NODE_COLORS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: v.bg, borderColor: v.border, borderWidth: 1 }}
            />
            {v.label}
          </div>
        ))}
        <span className="text-slate-300">|</span>
        <span>节点圆点大小 = 重要性 1-5</span>
        {graph && (
          <>
            <span className="text-slate-300">|</span>
            <span>
              {graph.summary.total} 节点 · {graph.summary.mastered} 已掌握 · {graph.summary.in_progress} 在学 · {graph.summary.unstudied} 未学
              {graph.summary.weak > 0 && <span className="ml-1 text-rose-600">· {graph.summary.weak} 薄弱</span>}
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          加载失败: {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">加载图谱…</span>
        </div>
      ) : graph && graph.nodes.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          <div className="overflow-x-auto">
            <svg width={W} height={svgH} viewBox={`0 0 ${W} ${svgH}`} className="block">
              {graph.edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const ax = PAD + a.x * (COL_W + COL_GAP) + COL_W / 2;
                const ay = PAD + a.y * ROW_H + ROW_H / 2;
                const bx = PAD + b.x * (COL_W + COL_GAP) + COL_W / 2;
                const by = PAD + b.y * ROW_H + ROW_H / 2;
                return (
                  <path
                    key={i}
                    d={`M ${ax} ${ay} C ${(ax + bx) / 2} ${ay}, ${(ax + bx) / 2} ${by}, ${bx} ${by}`}
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray={e.relation === 'related' ? '3 3' : undefined}
                  />
                );
              })}
              {graph.nodes.map((n) => {
                const p = positions.get(n.code)!;
                const cx = PAD + p.x * (COL_W + COL_GAP) + COL_W / 2;
                const cy = PAD + p.y * ROW_H + ROW_H / 2;
                const cls = classifyMastery(n);
                const c = NODE_COLORS[cls];
                const r = 10 + n.importance * 3;
                return (
                  <g key={n.code} style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(n)}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={c.bg}
                      stroke={c.border}
                      strokeWidth={selectedNode?.code === n.code ? 3 : 1.5}
                    />
                    {n.has_video && (
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill={c.text}>
                        ▶
                      </text>
                    )}
                    <text x={cx} y={cy + r + 12} textAnchor="middle" fontSize={11} fill="#1f2937">
                      {n.name.length > 8 ? n.name.slice(0, 8) + '…' : n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {showChapters && (
            <div className="mt-2 overflow-x-auto">
              <div className="flex gap-[50px] px-[30px]" style={{ minWidth: W }}>
                {chapters.map((ch) => (
                  <div
                    key={ch}
                    style={{ width: COL_W }}
                    className="text-center text-xs font-medium text-slate-500"
                  >
                    {ch.replace(/·.*$/, '')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Brain className="h-6 w-6" />}
          title="该学科/年级暂无知识点"
          desc="v0.2 目前只有数学 G3 数据"
        />
      )}

      {selectedNode && graph && (
        <NodeDetail node={selectedNode} nodes={graph.nodes} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

function NodeDetail({
  node,
  onClose,
}: {
  node: GraphNode;
  nodes: GraphNode[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">{node.chapter}</p>
            <h3 className="text-lg font-semibold text-slate-900">{node.name}</h3>
            <p className="mt-1 font-mono text-xs text-slate-400">{node.code}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <div className="text-lg font-bold text-slate-900">{node.error_count}</div>
            <div className="text-xs text-slate-500">错题数</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <div className="text-lg font-bold text-slate-900">
              {Math.round(node.mastery * 100)}%
            </div>
            <div className="text-xs text-slate-500">掌握度</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <div className="text-lg font-bold text-slate-900">{node.difficulty}/5</div>
            <div className="text-xs text-slate-500">难度</div>
          </div>
        </div>

        {node.error_count > 0 && node.mastery < 0.8 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            错 {node.error_count} 次, 掌握度低 · 建议看 basic.sh.smartedu.cn 微课复习
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Link
            href="/errors"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            看关联错题
          </Link>
          {node.has_video && (
            <button
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              onClick={() => alert('微课链接 (MVP 阶段 5 后期接入 basic.sh.smartedu.cn 真实链接)')}
            >
              <ExternalLink className="h-3.5 w-3.5" /> 看微课
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
