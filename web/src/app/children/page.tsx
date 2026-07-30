'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { childrenApi } from '@/lib/children';
import { getErrorMessage } from '@/lib/api';
import type { Child } from '@/lib/types';
import { Plus, Users, Archive } from 'lucide-react';

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
    if (!confirm(`确定归档「${name}」？归档后可在列表中恢复。`)) return;
    try {
      await childrenApi.archive(id);
      setChildren((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center text-gray-500">加载中…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">孩子</h1>
          <p className="mt-1 text-sm text-gray-500">共 {children.length} 个</p>
        </div>
        <Link
          href="/children/new"
          className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          添加
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-base font-semibold text-gray-700">还没有孩子</h3>
          <Link
            href="/children/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            添加第一个孩子
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <Link href={`/children/${child.id}`} className="flex flex-1 items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{child.name}</h3>
                  <p className="text-xs text-gray-500">
                    {child.grade} 年级 · {child.textbook_versions.length} 个教材已绑
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleArchive(child.id, child.name)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                title="归档"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
