'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookMarked, Plus, RefreshCw, AlertCircle, Sparkles, Filter, ArrowRight } from 'lucide-react';
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
import { PageHeader, EmptyState, Loading } from '@/components/NavBar';

const ERROR_TYPE_COLORS: Record<string, string> = {
  CARELESS: 'bg-orange-100 text-orange-700',
  READING_WRONG: 'bg-rose-100 text-rose-700',
  METHOD_WRONG: 'bg-violet-100 text-violet-700',
  CONCEPT_CONFUSE: 'bg-pink-100 text-pink-700',
  KNOWLEDGE_GAP: 'bg-blue-100 text-blue-700',
  TIME_PRESSURE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800',
  reviewing: 'bg-indigo-100 text-indigo-800',
  mastered: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-600',
};

const TABS = [
  { v: 'active', label: '活跃' },
  { v: 'mastered', label: '已掌握' },
  { v: 'archived', label: '已归档' },
  { v: 'all', label: '全部' },
];

export default function ErrorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryChildId = searchParams.get('child_id');

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(queryChildId);
  const [items, setItems] = useState<ErrorItemListItem[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/errors');
      return;
    }
    childrenApi
      .list()
      .then((cs) => {
        setChildren(cs);
        if (!childId && cs.length > 0) setChildId(cs[0].id);
        else if (childId && !cs.find((c) => c.id === childId) && cs.length > 0) setChildId(cs[0].id);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [router, childId]);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    Promise.all([
      errorsApi.list(childId, {
        status: filterStatus === 'active' ? undefined : filterStatus,
        includeArchived: filterStatus === 'archived' || filterStatus === 'mastered' || filterStatus === 'all',
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        加载失败: {error}
      </div>
    );
  }

  if (!loading && children.length === 0) {
    return (
      <div>
        <PageHeader icon={<BookMarked className="h-5 w-5" />} title="错题本" />
        <EmptyState
          icon={<BookMarked className="h-6 w-6" />}
          title="先添加孩子"
          desc="每个孩子有独立的错题本"
          action={
            <Link
              href="/children/new"
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              添加孩子 <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title="错题本"
        subtitle={
          children.length > 1
            ? `共 ${children.length} 个孩子, 切换查看`
            : children[0]
            ? `${children[0].name} · ${children[0].grade} 年级`
            : ''
        }
        action={
          <div className="flex items-center gap-2">
            {children.length > 1 && childId && (
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary-400"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (childId) {
                  setLoading(true);
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
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {childId && (
              <Link
                href={`/errors/new?child_id=${childId}`}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                录错题
              </Link>
            )}
          </div>
        }
      />

      {/* 4 个核心指标 */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="总错题" value={stats.total} color="bg-slate-50 text-slate-700" />
          <StatCard
            label="今日待复习"
            value={stats.due_today}
            color={stats.due_today > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}
          />
          <StatCard label="本周已掌握" value={stats.mastered_this_week} color="bg-emerald-50 text-emerald-700" />
          <StatCard label="复习中" value={stats.by_status.reviewing || 0} color="bg-indigo-50 text-indigo-700" />
        </div>
      )}

      {/* 筛选 tab */}
      <div className="mb-4 flex gap-1.5 text-sm">
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setFilterStatus(t.v)}
            className={`rounded-full px-3.5 py-1.5 transition ${
              filterStatus === t.v
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 错题列表 */}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="还没有错题"
          desc="录第一道试试, 系统会自动安排复习"
          action={
            childId ? (
              <Link
                href={`/errors/new?child_id=${childId}`}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> 录错题
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/errors/${it.id}?child_id=${it.child_id}`}
                className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                    {SUBJECT_LABELS?.[it.subject] || it.subject}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 ${
                      ERROR_TYPE_COLORS[it.error_type] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ERROR_TYPE_LABELS[it.error_type] || it.error_type}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 ${
                      STATUS_COLORS[it.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ERROR_STATUS_LABELS[it.status] || it.status}
                  </span>
                  {it.review_count > 0 && (
                    <span className="text-slate-400">已复习 {it.review_count} 次</span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-800">
                  {it.question_preview}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {new Date(it.created_at).toLocaleString('zh-CN')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { SUBJECT_LABELS } from '@/lib/types';

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
