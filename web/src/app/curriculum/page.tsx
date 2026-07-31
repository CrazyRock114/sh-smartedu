'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { curriculumApi, type CurriculumChangeListItem, type WeeklyChaptersData } from '@/lib/curriculum';
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

const CHANGE_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  new: { label: '新增', color: 'bg-emerald-100 text-emerald-700' },
  adjusted: { label: '调整', color: 'bg-amber-100 text-amber-700' },
  removed: { label: '删除', color: 'bg-rose-100 text-rose-700' },
  renamed: { label: '改名', color: 'bg-blue-100 text-blue-700' },
};

export default function CurriculumPage() {
  const router = useRouter();

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [subject, setSubject] = useState('math');
  const [version, setVersion] = useState('沪教版');
  const [semester, setSemester] = useState('2024-fall');

  const [changes, setChanges] = useState<CurriculumChangeListItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyChaptersData | null>(null);
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
  const grade = currentChild?.grade ?? 3;

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    if (currentChild) {
      const tv = currentChild.textbook_versions.find((t) => t.subject === subject);
      if (tv) setVersion(tv.version);
    }
    Promise.all([
      curriculumApi.listChanges({ grade, subject, verifiedOnly: false }),
      curriculumApi.weekly({ grade, subject, version, semester }),
    ])
      .then(([cs, w]) => {
        setChanges(cs);
        setWeekly(w);
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
            <ul className="space-y-2">
              {weekly.chapters.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between rounded-xl border border-slate-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/30"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{c.chapter}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.knowledge_point_count} 个知识点
                      {c.knowledge_point_codes.length > 0 && (
                        <span className="ml-1 font-mono text-[10px] text-slate-400">
                          ({c.knowledge_point_codes.slice(0, 3).join(', ')}
                          {c.knowledge_point_codes.length > 3 && '...'})
                        </span>
                      )}
                    </p>
                  </div>
                  {c.video_url && (
                    <a
                      href={c.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-xs text-primary-700 hover:bg-primary-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                      微课
                    </a>
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
