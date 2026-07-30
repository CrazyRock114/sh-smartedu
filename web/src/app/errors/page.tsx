'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookMarked, Plus, RefreshCw, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { errorsApi } from '@/lib/errors';
import {
  ERROR_TYPE_LABELS,
  ERROR_STATUS_LABELS,
  type Child,
  type ErrorItemListItem,
  type ErrorStats,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/api';

// 错因配色
const ERROR_TYPE_COLORS: Record<string, string> = {
  CARELESS: 'bg-orange-100 text-orange-700',
  READING_WRONG: 'bg-rose-100 text-rose-700',
  METHOD_WRONG: 'bg-violet-100 text-violet-700',
  CONCEPT_CONFUSE: 'bg-pink-100 text-pink-700',
  KNOWLEDGE_GAP: 'bg-blue-100 text-blue-700',
  TIME_PRESSURE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

// 状态配色
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-indigo-100 text-indigo-800',
  mastered: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const SUBJECT_LABELS: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  science: '科学',
  moral: '道德与法治',
  pe: '体育',
  art: '美术',
};

export default function ErrorsPage() {
  const router = useRouter();

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [items, setItems] = useState<ErrorItemListItem[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active'); // active = new+reviewing

  // 加载孩子列表
  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/errors');
      return;
    }
    childrenApi
      .list()
      .then((cs) => {
        setChildren(cs);
        if (cs.length > 0) setChildId(cs[0].id);
        else setLoading(false);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [router]);

  // 加载错题 + 统计
  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    Promise.all([
      errorsApi.list(childId, {
        status: filterStatus === 'active' ? undefined : filterStatus,
        includeArchived: filterStatus === 'archived' || filterStatus === 'mastered',
      }),
      errorsApi.stats(childId),
    ])
      .then(([list, st]) => {
        setItems(list);
        setStats(st);
        setLoading(false);
      })
      .catch((e) => {
        setError(getErrorMessage(e));
        setLoading(false);
      });
  }, [childId, filterStatus]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          加载失败: {error}
        </div>
      </main>
    );
  }

  if (!loading && children.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <BookMarked className="mx-auto h-10 w-10 text-gray-300" />
          <h1 className="mt-3 text-xl font-semibold text-gray-700">错题本</h1>
          <p className="mt-2 text-sm text-gray-500">先添加孩子, 再录错题</p>
          <Link
            href="/children/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            添加孩子
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* 标题 + 操作 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📒 错题本</h1>
          {children.length > 1 && childId && (
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="mt-1 rounded border-gray-300 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade}年级)
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              if (childId) {
                Promise.all([errorsApi.list(childId), errorsApi.stats(childId)])
                  .then(([list, st]) => {
                    setItems(list);
                    setStats(st);
                    setLoading(false);
                  })
                  .catch((e) => {
                    setError(getErrorMessage(e));
                    setLoading(false);
                  });
              }
            }}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
            title="刷新"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {childId && (
            <Link
              href={`/errors/new?child_id=${childId}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              录错题
            </Link>
          )}
        </div>
      </div>

      {/* 统计卡 */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<BookMarked className="h-4 w-4" />}
            label="总错题"
            value={stats.total}
            color="bg-slate-50 text-slate-700"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="今日待复习"
            value={stats.due_today}
            color="bg-rose-50 text-rose-700"
          />
          <StatCard
            icon={<RefreshCw className="h-4 w-4" />}
            label="本周已掌握"
            value={stats.mastered_this_week}
            color="bg-green-50 text-green-700"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="复习中"
            value={stats.by_status.reviewing || 0}
            color="bg-indigo-50 text-indigo-700"
          />
        </div>
      )}

      {/* 筛选 tab */}
      <div className="mb-4 flex gap-2 text-sm">
        {[
          { v: 'active', label: '活跃' },
          { v: 'mastered', label: '已掌握' },
          { v: 'archived', label: '已归档' },
          { v: 'all', label: '全部' },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setFilterStatus(t.v)}
            className={`rounded-full px-3 py-1 ${
              filterStatus === t.v
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 错题列表 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">加载中…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">还没有错题 · 录第一道试试</p>
          {childId && (
            <Link
              href={`/errors/new?child_id=${childId}`}
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            >
              录错题
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/errors/${it.id}?child_id=${it.child_id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    {SUBJECT_LABELS[it.subject] || it.subject}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 ${
                      ERROR_TYPE_COLORS[it.error_type] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ERROR_TYPE_LABELS[it.error_type] || it.error_type}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 ${
                      STATUS_COLORS[it.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {ERROR_STATUS_LABELS[it.status] || it.status}
                  </span>
                  {it.review_count > 0 && (
                    <span className="text-gray-400">已复习 {it.review_count} 次</span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-gray-800">{it.question_preview}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(it.created_at).toLocaleString('zh-CN')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
