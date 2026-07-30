'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import type { Child } from '@/lib/types';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { SUBJECTS, TEXTBOOK_VERSIONS } from '@/lib/types';

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

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center text-gray-500">加载中…</div>
      </main>
    );
  }

  if (error || !child) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || '孩子不存在'}
        </div>
        <Link href="/children" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          返回孩子列表
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/children"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-semibold text-primary-700">
          {child.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
          <p className="text-sm text-gray-500">{child.grade} 年级</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700">教材版本</h2>
        <div className="mt-3 space-y-2">
          {child.textbook_versions.map((tv) => {
            const subj = SUBJECTS.find((s) => s.value === tv.subject);
            return (
              <div
                key={tv.subject}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{subj?.label || tv.subject}</span>
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  {tv.version}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700">即将可用</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-500">
          <li className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            错题本 (阶段 3)
          </li>
          <li className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            学情周报 (阶段 4)
          </li>
        </ul>
      </div>
    </main>
  );
}
