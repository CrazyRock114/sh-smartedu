'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Sparkles, Play } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { curriculumApi, type CurriculumChangeListItem, type WeeklyChaptersData, type RealVideoItem } from '@/lib/curriculum';
import type { Child } from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/NavBar';

const SUBJECTS = [
  { value: 'math', label: '数学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'science', label: '科学' },
];

const SEMESTERS = [
  { value: '2024-fall', label: '2024 秋' },
  { value: '2025-spring', label: '2025 春' },
  { value: '2025-fall', label: '2025 秋' },
  { value: '2026-spring', label: '2026 春' },
  { value: '2026-fall', label: '2026 秋' },
];

const SUBJECT_LABELS: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  science: '科学',
};

function semesterLabel(s: string): string {
  return SEMESTERS.find((x) => x.value === s)?.label || s;
}

const CHANGE_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  new: { label: '新增', color: 'bg-emerald-100 text-emerald-700' },
  adjusted: { label: '调整', color: 'bg-amber-100 text-amber-700' },
  removed: { label: '删除', color: 'bg-rose-100 text-rose-700' },
  renamed: { label: '改名', color: 'bg-blue-100 text-blue-700' },
};

export default function CurriculumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  // 默认值: 三年级 / 数学 / 沪教版 / 2025 春季 (G3 孩子常用)
  const [subject, setSubject] = useState(
    () => searchParams.get('subject') || 'math'
  );
  const [version, setVersion] = useState(
    () => searchParams.get('version') || '沪教版'
  );
  const [semester, setSemester] = useState(
    () => searchParams.get('semester') || '2025-spring'
  );
  const [fixedGrade, setFixedGrade] = useState<number | null>(
    () => {
      const g = searchParams.get('grade');
      return g ? parseInt(g, 10) : null;
    }
  );

  const [changes, setChanges] = useState<CurriculumChangeListItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyChaptersData | null>(null);
  const [realVideos, setRealVideos] = useState<RealVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/curriculum');
      return;
    }
    childrenApi
      .list()
      .then((cs) => {
        setChildren(cs);
        if (cs.length > 0) setChildId(cs[0].id);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [router]);

  const currentChild = children.find((c) => c.id === childId);
  // 优先: URL query grade > 孩子 grade > 默认 3
  const grade = fixedGrade ?? currentChild?.grade ?? 3;

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    if (currentChild) {
      const tv = currentChild.textbook_versions.find((t) => t.subject === subject);
      if (tv) {
        setVersion(tv.version);
      } else {
        // 孩子没填该学科教材 → 用学科默认版本
        const defaults: Record<string, string> = {
          math: '沪教版',
          chinese: '统编版',
          english: '人教PEP版',
          science: '教科版',
        };
        if (defaults[subject]) setVersion(defaults[subject]);
      }
    } else {
      // 没有孩子 → 学科默认版本
      const defaults: Record<string, string> = {
        math: '沪教版',
        chinese: '统编版',
        english: '人教PEP版',
        science: '教科版',
      };
      if (defaults[subject] && !['沪教版', '统编版', '人教PEP版', '教科版'].includes(version)) {
        setVersion(defaults[subject]);
      }
    }
    Promise.all([
      curriculumApi.listChanges({ grade, subject, verifiedOnly: false }),
      curriculumApi.weekly({ grade, subject, version, semester }),
      curriculumApi.realVideos({ grade, subject, version, semester, limit: 5 })
        .catch(() => [] as RealVideoItem[]),  // realVideos 拉不到不阻塞 UI
    ])
      .then(([cs, w, rv]) => {
        setChanges(cs);
        setWeekly(w);
        setRealVideos(rv);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [childId, subject, version, semester, grade, currentChild]);

  const versionOptions = useMemo(() => {
    const opts: string[] = [];
    if (currentChild) {
      for (const tv of currentChild.textbook_versions) {
        if (tv.subject === subject) opts.push(tv.version);
      }
    }
    if (!opts.includes(version)) opts.push(version);
    return opts.length > 0 ? opts : ['沪教版'];
  }, [currentChild, subject, version]);

  return (
    <div>
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="教材同步"
        subtitle="本周章节 + 2024-2026 改了什么"
      />

      {/* 控制条 */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          {children.length > 1 && childId && (
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade} 年级)
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">学科</span>
            <div className="flex gap-1">
              {SUBJECTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSubject(s.value)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition ${
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
            <span className="text-xs text-slate-500">版本</span>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {versionOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">学期</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
            >
              {SEMESTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 今日推荐微课 (hero) — 优先真实微课 (smartedu 直达播放器) */}
      {(() => {
        // 优先用 smartedu 真实微课 (新窗口直跳视频播放器)
        // 兜底: weekly.weekly_videos (人工索引) → chapters 里的 video
        if (realVideos.length === 0
            && (!weekly?.weekly_videos || weekly.weekly_videos.length === 0)) {
          return null;
        }
        const useReal = realVideos.length > 0;
        const heroVideos = useReal
          ? realVideos.map((v) => ({
              id: v.id,
              title: v.title,
              subtitle: [v.teacher, v.school].filter(Boolean).join(' · '),
              url: v.direct_url,
              importance: v.importance,
            }))
          : (weekly!.weekly_videos.length > 0
              ? weekly!.weekly_videos.slice(0, 5)
              : (weekly!.chapters?.flatMap((c) => c.videos ?? []) ?? [])
                  .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
                  .slice(0, 5)
            ).map((v) => ({
              id: v.id,
              title: v.episode,
              subtitle: v.description || '',
              url: v.direct_url || v.search_url || v.chapter_listing_url,
              importance: v.importance,
            }));
        return (
        <section className="mb-6 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
              <Play className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-900">
                {useReal ? '本周真实微课 (直达视频)' : '本周推荐微课'}
              </h2>
              <p className="text-xs text-slate-500">
                {useReal
                  ? '点开直接看视频播放器 · 来源: basic.sh.smartedu.cn 真实抓取'
                  : '点开搜索结果 · 来自人工章节索引'}
              </p>
            </div>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              {heroVideos.length} 节
            </span>
          </div>
          {useReal ? (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
              ✨ <strong>真实微课</strong>: 从 basic.sh.smartedu.cn 抓取的 resource_id, 点开直跳视频播放器
            </p>
          ) : (
            <p className="mb-3 rounded-lg bg-white/70 px-3 py-1.5 text-[11px] text-slate-600">
              💡 点开会在<strong>新窗口</strong>跳到 basic.sh.smartedu.cn 搜索结果（已替你搜好关键词）
            </p>
          )}
          <ul className="space-y-2">
            {heroVideos.map((v) => (
              <li key={v.id}>
                <a
                  href={v.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                    <Play className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                      {v.title}
                    </p>
                    {v.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {v.subtitle}
                      </p>
                    )}
                  </div>
                  {v.importance >= 4 && (
                    <span className="flex-shrink-0 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      必看
                    </span>
                  )}
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-primary-600" />
                </a>
              </li>
            ))}
          </ul>
        </section>
        );
      })()}

      {/* 本周学什么 */}
      {weekly && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <h2 className="text-base font-semibold text-slate-800">本周要学 (第 {weekly.week_index} 周)</h2>
          </div>

          {weekly.is_new_textbook && weekly.change_notice && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{weekly.change_notice}</span>
            </div>
          )}

          {weekly.chapters.length === 0 ? (
            <p className="text-sm text-slate-400">该学期暂无章节数据</p>
          ) : (
            <ul className="space-y-3">
              {weekly.chapters.map((c, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 p-4 transition hover:border-primary-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{c.chapter}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.knowledge_point_count} 个知识点
                        {c.knowledge_point_codes.length > 0 && (
                          <span className="ml-1 font-mono text-[10px] text-slate-400">
                            ({c.knowledge_point_codes.slice(0, 3).join(', ')}
                            {c.knowledge_point_codes.length > 3 && '...'})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* 微课列表 */}
                  {c.videos && c.videos.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {c.videos.map((v) => {
                        // 优先 direct_url (真实微课页) > chapter_listing_url (整章列表) > search_url
                        const baseUrl = v.direct_url || v.chapter_listing_url || v.search_url;
                        return (
                          <li key={v.id} className="flex items-center gap-2 text-sm">
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                              ▶
                            </span>
                            <a
                              href={baseUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 truncate text-slate-700 hover:text-primary-700 hover:underline"
                            >
                              {v.episode}
                            </a>
                            {v.importance >= 4 && (
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                                必看
                              </span>
                            )}
                            {v.description && (
                              <span className="hidden truncate text-xs text-slate-400 sm:inline">
                                {v.description}
                              </span>
                            )}
                            <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-400" />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 2024-2026 改了什么 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">2024-2026 改版追踪</h2>
          <span className="text-xs text-slate-400">({changes.length} 条)</span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">加载中…</p>
        ) : changes.length === 0 ? (
          <p className="text-sm text-slate-400">该学科/年级暂无改版信息</p>
        ) : (
          <ul className="space-y-3">
            {changes.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-100 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">G{c.grade} {c.subject}</span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-700">{c.version}</span>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-purple-700">{c.semester}</span>
                  {c.verified ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      已确认
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-2 py-0.5 text-amber-700">
                      <AlertCircle className="h-3 w-3" />
                      待复核
                    </span>
                  )}
                  <span className="text-slate-400">{c.change_count} 项改动</span>
                </div>
                <ChangeDetail changeId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ChangeDetail({ changeId }: { changeId: number }) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof curriculumApi.getChange>> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || detail) return;
    curriculumApi.getChange(changeId).then(setDetail).catch(() => {});
  }, [open, changeId, detail]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
      >
        <ChevronRight className="h-3 w-3" />
        展开详情
      </button>
    );
  }

  if (!detail) {
    return <p className="text-xs text-slate-400">加载…</p>;
  }

  return (
    <div className="space-y-2">
      {detail.changes.map((ch, i) => {
        const badge = CHANGE_TYPE_BADGE[ch.type] || { label: ch.type, color: 'bg-slate-100 text-slate-700' };
        return (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className={`rounded px-1.5 py-0.5 ${badge.color}`}>{badge.label}</span>
              <span className="font-medium text-slate-700">{ch.chapter}</span>
            </div>
            <p className="text-sm text-slate-700">{ch.summary}</p>
            {ch.key_points && ch.key_points.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                {ch.key_points.map((kp, ki) => (
                  <li key={ki}>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {detail.source_url && (
        <a
          href={detail.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ExternalLink className="h-3 w-3" />
          {detail.source}
        </a>
      )}
    </div>
  );
}
