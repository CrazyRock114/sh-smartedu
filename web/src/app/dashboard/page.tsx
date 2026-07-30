'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import type { Child, CurrentUser } from '@/lib/types';
import { Users, BookOpen, Brain, Bell, ArrowRight, Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
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
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center text-gray-500">加载中…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {/* 欢迎语 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          你好, {user?.nickname || user?.email?.split('@')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {children.length > 0
            ? `共 ${children.length} 个孩子, 推送时间 ${user?.push_time || '19:00'}`
            : '还没有添加孩子, 先加一个开始使用吧'}
        </p>
      </div>

      {/* 孩子卡片 (或空状态) */}
      {children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-base font-semibold text-gray-700">先添加一个孩子</h3>
          <p className="mt-1 text-sm text-gray-500">添加孩子后, 可以录入错题、看学情、绑教材</p>
          <Link
            href="/children/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            添加孩子
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-base font-semibold text-primary-700">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{child.name}</h3>
                  <p className="text-xs text-gray-500">
                    {child.grade} 年级 ·{' '}
                    {child.textbook_versions.find((t) => t.subject === 'math')?.version || '数学未选'}
                  </p>
                </div>
              </div>
              <Link
                href={`/children/${child.id}`}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          ))}
          <Link
            href="/children/new"
            className="flex items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 bg-white py-3 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-4 w-4" />
            再加一个
          </Link>
        </div>
      )}

      {/* 功能入口 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/errors"
          className="group rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:border-primary-300 hover:shadow-sm"
        >
          <BookOpen className="mx-auto h-6 w-6 text-primary-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-primary-600">错题本</p>
        </Link>
        <Link
          href="/knowledge"
          className="group rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:border-primary-300 hover:shadow-sm"
        >
          <Brain className="mx-auto h-6 w-6 text-primary-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-primary-600">知识图谱</p>
        </Link>
        <Link
          href="/curriculum"
          className="group rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:border-primary-300 hover:shadow-sm"
        >
          <Users className="mx-auto h-6 w-6 text-primary-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-primary-600">教材同步</p>
        </Link>
        <Link
          href="/push"
          className="group rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:border-primary-300 hover:shadow-sm"
        >
          <Bell className="mx-auto h-6 w-6 text-primary-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 group-hover:text-primary-600">推送设置</p>
        </Link>
      </div>
    </main>
  );
}
