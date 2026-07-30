'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  BookOpen,
  Target,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { analyticsApi, type DashboardData, type HeatmapData } from '@/lib/analytics';
import type { Child, CurrentUser, WeeklyReportResponse } from '@/lib/types';
import { getErrorMessage } from '@/lib/api';

const SUBJECT_BG: Record<string, string> = {
  math: 'from-blue-500 to-blue-600',
  chinese: 'from-rose-500 to-rose-600',
  english: 'from-emerald-500 to-emerald-600',
  science: 'from-amber-500 to-amber-600',
  moral: 'from-violet-500 to-violet-600',
  pe: 'from-slate-500 to-slate-600',
  art: 'from-pink-500 to-pink-600',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  CARELESS: '粗心',
  READING_WRONG: '审题',
  METHOD_WRONG: '方法',
  CONCEPT_CONFUSE: '概念',
  KNOWLEDGE_GAP: '知识',
  TIME_PRESSURE: '速度',
  OTHER: '其他',
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/dashboard');
      return;
    }
    Promise.all([authApi.me(), childrenApi.list()])
      .then(([u, c]) => {
        setUser(u);
        setChildren(c);
        if (c.length > 0) setChildId(c[0].id);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [router]);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    Promise.all([
      analyticsApi.dashboard(childId),
      analyticsApi.heatmap(childId, 30),
      analyticsApi.weeklyReport(childId),
    ])
      .then(([d, h, r]) => {
        setDashboard(d);
        setHeatmap(h);
        setReport(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, [childId]);

  if (loading && !dashboard) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center text-gray-500">加载学情中…</div>
      </main>
    );
  }

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
          <Target className="mx-auto h-10 w-10 text-gray-300" />
          <h1 className="mt-3 text-xl font-semibold text-gray-700">先添加一个孩子</h1>
          <p className="mt-2 text-sm text-gray-500">添加孩子后, 这里会显示完整学情</p>
          <Link
            href="/children/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            添加孩子
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* 顶部: 孩子切换 + 欢迎 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            你好, {user?.nickname || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {dashboard
              ? `${dashboard.child.name} (${dashboard.child.grade}年级) · ${new Date(dashboard.last_updated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新`
              : '加载中…'}
          </p>
        </div>
        {children.length > 1 && childId && (
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.grade}年级)
              </option>
            ))}
          </select>
        )}
      </div>

      {dashboard && (
        <>
          {/* 今日待复习 + 最近 7 天 */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Play className="h-4 w-4" />}
              label="今日待复习"
              value={dashboard.today_due}
              color={dashboard.today_due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-gray-500'}
              href={dashboard.today_due > 0 ? '/errors' : undefined}
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="本周新错"
              value={dashboard.recent_7d.new_errors}
              color="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="本周掌握"
              value={dashboard.recent_7d.mastered}
              color="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={<Calendar className="h-4 w-4" />}
              label="活跃天数"
              value={`${dashboard.recent_7d.active_days}/7`}
              color="bg-blue-50 text-blue-700"
            />
          </div>

          {/* 学科掌握度 */}
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">学科掌握度</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dashboard.subjects.map((s) => {
                const totalAll = s.total;
                const noData = totalAll === 0;
                return (
                  <Link
                    key={s.subject}
                    href={noData ? `/errors/new?child_id=${childId}&subject=${s.subject}` : `/errors?child_id=${childId}`}
                    className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-semibold text-white ${
                          SUBJECT_BG[s.subject] || 'from-gray-400 to-gray-500'
                        }`}
                      >
                        {s.label.charAt(0)}
                      </span>
                      <span className="font-semibold text-gray-800">{s.label}</span>
                    </div>
                    {noData ? (
                      <p className="text-xs text-gray-400">还没有数据 · 录第一题</p>
                    ) : (
                      <>
                        <div className="mb-1 flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-gray-900">
                            {Math.round(s.mastery_score * 100)}%
                          </span>
                          <span className="text-xs text-gray-400">
                            掌握 {s.mastered}/{s.total}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${
                              s.mastery_score >= 0.7
                                ? 'bg-emerald-500'
                                : s.mastery_score >= 0.4
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(s.mastery_score * 100, 4)}%` }}
                          />
                        </div>
                        {Object.keys(s.by_error_type).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(s.by_error_type)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                                >
                                  {ERROR_TYPE_LABELS[k] || k} {v}
                                </span>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 错题热力图 */}
          {heatmap && heatmap.cells.length > 0 && (
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">错题热力图 (近 30 天)</h2>
                <span className="text-xs text-gray-400">最忙一天: {heatmap.max_per_day} 题</span>
              </div>
              <Heatmap cells={heatmap.cells} max={heatmap.max_per_day} />
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>少</span>
                {[0, 1, 3, 5, 8].map((threshold) => (
                  <div
                    key={threshold}
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: getHeatmapColor(threshold, heatmap.max_per_day) }}
                  />
                ))}
                <span>多</span>
              </div>
            </section>
          )}

          {/* 薄弱知识点 + 周报 */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top 薄弱 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">薄弱知识点 Top 5</h2>
              {dashboard.weak_points.length === 0 ? (
                <p className="text-sm text-gray-400">还没有关联知识点的错题</p>
              ) : (
                <ul className="space-y-2">
                  {dashboard.weak_points.map((wp, i) => (
                    <li key={wp.code} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-600">
                          {i + 1}
                        </span>
                        <code className="font-mono text-xs text-gray-700">{wp.code}</code>
                      </span>
                      <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                        错 {wp.error_count} 次
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-gray-400">
                错题录入时关联知识点 → 这里自动聚合
              </p>
            </section>

            {/* 周报 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">上周学情速览</h2>
              {report ? (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <MiniStat
                      label="新错"
                      value={report.total_new_errors}
                      color="text-amber-600"
                    />
                    <MiniStat
                      label="复习"
                      value={report.total_reviewed}
                      color="text-blue-600"
                    />
                    <MiniStat
                      label="掌握"
                      value={report.total_mastered}
                      color="text-emerald-600"
                    />
                  </div>
                  {report.highlights.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-gray-500">亮点</p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {report.highlights.map((h, i) => (
                          <li key={i} className="flex gap-1">
                            <span className="text-emerald-500">✓</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.next_week_focus.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">下周重点</p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {report.next_week_focus.map((f, i) => (
                          <li key={i} className="flex gap-1">
                            <span className="text-blue-500">→</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">加载中…</p>
              )}
            </section>
          </div>

          {/* 快捷入口 */}
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLink
              href="/errors"
              icon={<BookOpen className="h-5 w-5" />}
              label="错题本"
              desc="录 / 复习"
            />
            <QuickLink
              href="/knowledge"
              icon={<Target className="h-5 w-5" />}
              label="知识图谱"
              desc="可视化"
            />
            <QuickLink
              href="/curriculum"
              icon={<TrendingUp className="h-5 w-5" />}
              label="教材同步"
              desc="2024-26 改版"
            />
            <QuickLink
              href="/push"
              icon={<Calendar className="h-5 w-5" />}
              label="推送设置"
              desc="推送 / 锁屏"
            />
          </section>
        </>
      )}
    </main>
  );
}

// === 子组件 ===

function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
    </Link>
  );
}

function getHeatmapColor(value: number, max: number): string {
  if (value === 0) return '#f3f4f6'; // gray-100
  if (max === 0) return '#f3f4f6';
  const ratio = value / max;
  if (ratio < 0.25) return '#fed7aa'; // orange-200
  if (ratio < 0.5) return '#fdba74'; // orange-300
  if (ratio < 0.75) return '#fb923c'; // orange-400
  return '#ea580c'; // orange-600
}

function Heatmap({
  cells,
  max,
}: {
  cells: { date: string; by_subject: Record<string, number>; total: number }[];
  max: number;
}) {
  // 5x6 grid (30 days, 5 weekday rows? No — 30 days = 30 cells, 5 weeks of 6 days)
  // Use week-aligned grid: pad start with empty cells if not Monday
  const startDate = new Date(cells[0]?.date || new Date());
  const startWeekday = (startDate.getDay() + 6) % 7; // 0=Mon
  const padded: ({ date?: string; total?: number; by_subject?: Record<string, number> })[] = [
    ...Array(startWeekday).fill({}),
    ...cells,
  ];
  while (padded.length % 7 !== 0) padded.push({});

  const weeks: (typeof padded)[] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1" style={{ minWidth: weeks.length * 14 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => {
              if (!cell.date) {
                return <div key={di} className="h-3 w-3" />;
              }
              return (
                <div
                  key={di}
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: getHeatmapColor(cell.total || 0, max) }}
                  title={`${cell.date}: ${cell.total} 题${
                    cell.total
                      ? ' (' +
                        Object.entries(cell.by_subject || {})
                          .map(([s, n]) => `${s}: ${n}`)
                          .join(', ') +
                        ')'
                      : ''
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
        <span>{cells[0]?.date.slice(5)}</span>
        <span>{cells[cells.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
