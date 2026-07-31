'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import type { Child } from '@/lib/types';
import { ArrowLeft, BookOpen, Users } from 'lucide-react';
import Link from 'next/link';
import { SUBJECTS, TEXTBOOK_VERSIONS } from '@/lib/types';
import { PageHeader, Loading } from '@/components/NavBar';

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/children/' + childId);
      return;
    }
    childrenApi
      .get(childId)
      .then(setChild)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [childId, router]);

  if (loading) return <Loading label="加载孩子信息…" />;

  if (error || !child) {
    return (
      <div className="max-w-2xl">
        <Link href="/children" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 返回
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || '孩子不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/children" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 返回孩子列表
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white">
          {child.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{child.name}</h1>
          <p className="text-sm text-slate-500">{child.grade} 年级</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">教材版本</h2>
        </div>
        {child.textbook_versions.length === 0 ? (
          <p className="text-sm text-slate-400">还未绑定任何教材</p>
        ) : (
          <div className="space-y-2">
            {child.textbook_versions.map((tv) => {
              const subj = SUBJECTS.find((s) => s.value === tv.subject);
              return (
                <div
                  key={tv.subject}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="text-slate-600">{subj?.label || tv.subject}</span>
                  <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                    {tv.version}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">快捷入口</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard?child_id=${child.id}`}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            📊 去看学情
          </Link>
          <Link
            href={`/errors?child_id=${child.id}`}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            📒 错题本
          </Link>
        </div>
      </section>
    </div>
  );
}
