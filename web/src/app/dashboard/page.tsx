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
  LayoutDashboard,
  Flame,
  Trophy,
  Clock,
  ListTodo,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { analyticsApi, type DashboardData, type HeatmapData } from '@/lib/analytics';
import { errorsApi } from '@/lib/errors';
import { curriculumApi, type WeeklyChaptersData } from '@/lib/curriculum';
import type { Child, CurrentUser, ReviewQueueItem, WeeklyReportResponse } from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/NavBar';

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
  const [todayReviews, setTodayReviews] = useState<ReviewQueueItem[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<{ episode: string; url: string; importance: number }[]>([]);
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
      errorsApi.reviewQueue(childId, 5),
    ])
      .then(async ([d, h, r, q]) => {
        setDashboard(d);
        setHeatmap(h);
        setReport(r);
        setTodayReviews(q);

        // 拉孩子的本周微课, 推 2 个最重要的
        const child = children.find((c) => c.id === childId);
        if (child) {
          const tv = child.textbook_versions.find((t) => t.subject === 'math') || child.textbook_versions[0];
          if (tv) {
            try {
              const w = await curriculumApi.weekly({
                grade: child.grade,
                subject: tv.subject,
                version: tv.version,
                semester: '2025-fall',
              });
              const vids = (w.weekly_videos && w.weekly_videos.length > 0)
                ? w.weekly_videos
                : w.chapters.flatMap((c) => c.videos ?? []);
              setRecommendedVideos(
                vids
                  .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
                  .slice(0, 2)
                  .map((v) => ({
                    episode: v.episode,
                    url: v.direct_url || v.search_url || v.chapter_listing_url || '#',
                    importance: v.importance,
                  }))
              );
            } catch {
              // 静默失败, 不影响 dashboard
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, [childId, children]);

  if (loading && !dashboard) return <Loading label="加载学情中…" />;

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
        <PageHeader
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="学情"
          subtitle="添加孩子后, 这里会显示完整学情"
        />
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="先添加一个孩子"
          desc="每个孩子有独立的错题本、图谱、学情"
          action={
            <Link
              href="/children/new"
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
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
      {/* 顶部欢迎 + 孩子切换 */}
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title={`你好, ${user?.nickname || user?.email?.split('@')[0] || '家长'} 👋`}
        subtitle={
          dashboard
            ? `${dashboard.child.name} · ${dashboard.child.grade} 年级 · ${new Date(dashboard.last_updated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新`
            : '加载中…'
        }
        action={
          children.length > 1 && childId ? (
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-primary-400"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  切换：{c.name} ({c.grade}年级)
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {dashboard && (
        <>
          {/* 4 个核心指标 */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Play className="h-4 w-4" />}
              label="今日待复习"
              value={dashboard.today_due}
              color={dashboard.today_due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}
              href={dashboard.today_due > 0 ? `/errors?child_id=${childId}` : undefined}
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="本周新错"
              value={dashboard.recent_7d.new_errors}
              color="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="本周掌握"
              value={dashboard.recent_7d.mastered}
              color="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              label="活跃天数"
              value={`${dashboard.recent_7d.active_days}/7`}
              color="bg-blue-50 text-blue-700"
            />
          </div>

          {/* 今日待办 (家长打开就知道今天该做什么) */}
          <TodayTodoPanel
            reviews={todayReviews}
            childId={childId}
            recommendedVideos={recommendedVideos}
          />

          {/* 学科掌握度 */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">学科掌握度</h2>
              <span className="text-xs text-slate-400">点击进入</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dashboard.subjects.map((s) => {
                const totalAll = s.total;
                const noData = totalAll === 0;
                return (
                  <Link
                    key={s.subject}
                    href={
                      noData
                        ? `/errors/new?child_id=${childId}&subject=${s.subject}`
                        : `/errors?child_id=${childId}`
                    }
                    className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-semibold text-white ${
                          SUBJECT_BG[s.subject] || 'from-slate-400 to-slate-500'
                        }`}
                      >
                        {s.label.charAt(0)}
                      </span>
                      <span className="font-semibold text-slate-800">{s.label}</span>
                    </div>
                    {noData ? (
                      <p className="text-xs text-slate-400">还没有数据 · 录第一题</p>
                    ) : (
                      <>
                        <div className="mb-1.5 flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900">
                            {Math.round(s.mastery_score * 100)}%
                          </span>
                          <span className="text-xs text-slate-400">
                            掌握 {s.mastered}/{s.total}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
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
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {Object.entries(s.by_error_type)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
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
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">错题热力图</h2>
                <span className="text-xs text-slate-400">近 30 天 · 最忙 {heatmap.max_per_day} 题/天</span>
              </div>
              <Heatmap cells={heatmap.cells} max={heatmap.max_per_day} />
              <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-slate-500">
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
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-slate-800">薄弱知识点 Top 5</h2>
              {dashboard.weak_points.length === 0 ? (
                <p className="text-sm text-slate-400">还没有关联知识点的错题</p>
              ) : (
                <ul className="space-y-2">
                  {dashboard.weak_points.map((wp, i) => (
                    <li key={wp.code} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-600">
                          {i + 1}
                        </span>
                        <code className="font-mono text-xs text-slate-700">{wp.code}</code>
                      </span>
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                        错 {wp.error_count} 次
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/knowledge"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
              >
                去看知识图谱 <ArrowRight className="h-3 w-3" />
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-slate-800">上周学情速览</h2>
              {report ? (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="新错" value={report.total_new_errors} color="text-amber-600" />
                    <MiniStat label="复习" value={report.total_reviewed} color="text-blue-600" />
                    <MiniStat label="掌握" value={report.total_mastered} color="text-emerald-600" />
                  </div>
                  {report.highlights.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">亮点</p>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {report.highlights.map((h, i) => (
                          <li key={i} className="flex gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.next_week_focus.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-500">下周重点</p>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {report.next_week_focus.map((f, i) => (
                          <li key={i} className="flex gap-1.5">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">加载中…</p>
              )}
            </section>
          </div>

          {/* 快捷入口 */}
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLink
              href={`/errors?child_id=${childId}`}
              icon={<BookOpen className="h-5 w-5" />}
              label="错题本"
              desc="录 / 复习"
              color="from-rose-500 to-rose-600"
            />
            <QuickLink
              href="/knowledge"
              icon={<Target className="h-5 w-5" />}
              label="知识图谱"
              desc="可视化"
              color="from-emerald-500 to-emerald-600"
            />
            <QuickLink
              href="/curriculum"
              icon={<TrendingUp className="h-5 w-5" />}
              label="教材同步"
              desc="2024-26 改版"
              color="from-blue-500 to-blue-600"
            />
            <QuickLink
              href="/push"
              icon={<Calendar className="h-5 w-5" />}
              label="推送设置"
              desc="推送 / 锁屏"
              color="from-amber-500 to-amber-600"
            />
          </section>
        </>
      )}
    </div>
  );
}

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
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="mb-1 flex items-center gap-1 text-xs opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
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
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  desc,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
    </Link>
  );
}

function getHeatmapColor(value: number, max: number): string {
  if (value === 0) return '#f1f5f9';
  if (max === 0) return '#f1f5f9';
  const ratio = value / max;
  if (ratio < 0.25) return '#fed7aa';
  if (ratio < 0.5) return '#fdba74';
  if (ratio < 0.75) return '#fb923c';
  return '#ea580c';
}

function Heatmap({ cells, max }: { cells: { date: string; total: number; by_subject: Record<string, number> }[]; max: number }) {
  const startDate = new Date(cells[0]?.date || new Date());
  const startWeekday = (startDate.getDay() + 6) % 7;
  const padded: { date?: string; total?: number; by_subject?: Record<string, number> }[] = [
    ...Array(startWeekday).fill({}),
    ...cells,
  ];
  while (padded.length % 7 !== 0) padded.push({});
  const weeks: typeof padded[] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1" style={{ minWidth: weeks.length * 14 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => {
              if (!cell.date) return <div key={di} className="h-3.5 w-3.5" />;
              return (
                <div
                  key={di}
                  className="h-3.5 w-3.5 rounded-sm"
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
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{cells[0]?.date.slice(5)}</span>
        <span>{cells[cells.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// === 今日待办面板 (W3 家长视角核心) ===
function TodayTodoPanel({
  reviews,
  childId,
  recommendedVideos,
}: {
  reviews: ReviewQueueItem[];
  childId: string;
  recommendedVideos: { episode: string; url: string; importance: number }[];
}) {
  const dueReviews = reviews.filter((r) => r.is_overdue || r.next_review_at === null);
  const reviewMin = dueReviews.length * 2;       // 粗估每题 2 分钟
  const videoMin = recommendedVideos.length * 10; // 粗估每集 10 分钟
  const totalMin = reviewMin + videoMin;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">今日待办</h2>
            <p className="text-xs text-slate-500">
              {totalMin > 0
                ? `复习 ${dueReviews.length} 题 + 看 ${recommendedVideos.length} 集 · 约 ${totalMin} 分钟`
                : '今天没有待办, 轻松一天 ✨'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
        </span>
      </div>

      {/* 复习区 */}
      {dueReviews.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            📚 复习 ({dueReviews.length})
          </p>
          <ul className="space-y-1.5">
            {dueReviews.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/errors/${r.id}?child_id=${childId}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                      {r.question_text.slice(0, 40)}
                      {r.question_text.length > 40 ? '…' : ''}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                      {SUBJECT_LABELS_R[r.subject] || r.subject} · {ERROR_TYPE_LABELS[r.error_type] || r.error_type} · 答对 {r.review_count} 次
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover:text-primary-600" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 微课区 */}
      {recommendedVideos.length > 0 && (
        <div className="mb-1">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            🎬 今日 2 集微课 ({recommendedVideos.length})
          </p>
          <ul className="space-y-1.5">
            {recommendedVideos.map((v, i) => (
              <li key={i}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                    <Play className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                      {v.episode}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      basic.sh.smartedu.cn · 约 10 分钟
                    </p>
                  </div>
                  {v.importance >= 4 && (
                    <span className="flex-shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      必看
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 0 任务提示 */}
      {dueReviews.length === 0 && recommendedVideos.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
          今日已无错题复习任务, 也无推荐微课。享受轻松一天。
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Link
          href={`/errors?child_id=${childId}`}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-medium text-slate-600 transition hover:border-primary-300 hover:text-primary-700"
        >
          全部错题
        </Link>
        <Link
          href="/curriculum"
          className="flex-1 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
        >
          <Play className="mr-1 inline h-3 w-3" />
          去看微课
        </Link>
      </div>
    </section>
  );
}

const SUBJECT_LABELS_R: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  science: '科学',
};
