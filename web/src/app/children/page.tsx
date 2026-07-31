'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import type { Child } from '@/lib/types';
import { Plus, Users, Archive, ArrowRight, BookOpen } from 'lucide-react';
import { PageHeader, EmptyState, Loading } from '@/components/NavBar';

export default function ChildrenListPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/children');
      return;
    }
    childrenApi
      .list()
      .then(setChildren)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [router]);

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`确定归档「${name}」?`)) return;
    try {
      await childrenApi.archive(id);
      setChildren((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (loading) return <Loading label="加载孩子列表…" />;

  return (
    <div>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="孩子"
        subtitle={`共 ${children.length} 个 · 每个孩子独立学情`}
        action={
          <Link
            href="/children/new"
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            添加
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="还没有孩子"
          desc="添加第一个孩子, 开始记录学情"
          action={
            <Link
              href="/children/new"
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              添加第一个孩子
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
              <Link href={`/children/${child.id}`} className="flex flex-1 items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{child.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <BookOpen className="h-3 w-3" />
                    {child.grade} 年级 · {child.textbook_versions.length} 个教材已绑
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  href={`/children/${child.id}`}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  title="查看"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleArchive(child.id, child.name)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="归档"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
