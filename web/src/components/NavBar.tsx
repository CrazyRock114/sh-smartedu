'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BookMarked,
  Network,
  BookOpen,
  Bell,
  GraduationCap,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import type { CurrentUser } from '@/lib/types';

const NAV = [
  { href: '/dashboard', label: '学情', icon: LayoutDashboard, desc: '仪表盘' },
  { href: '/children', label: '孩子', icon: Users, desc: '家庭' },
  { href: '/errors', label: '错题', icon: BookMarked, desc: '智能错题本' },
  { href: '/knowledge', label: '图谱', icon: Network, desc: '知识图谱' },
  { href: '/curriculum', label: '教材', icon: BookOpen, desc: '改版同步' },
  { href: '/push', label: '推送', icon: Bell, desc: '推送+锁屏' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage =
    pathname?.startsWith('/auth') || pathname?.startsWith('/watch');

  useEffect(() => {
    if (isAuthPage) return;
    if (!authApi.isLoggedIn()) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname, router, isAuthPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">学迹</div>
              <div className="text-[10px] text-slate-400">Xueji</div>
            </div>
          </Link>
          <button
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <div>{item.label}</div>
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                </div>
                {active && <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-slate-50/50 p-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-white">
                {(user?.nickname || user?.email?.split('@')[0] || '我').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">
                  {user?.nickname || user?.email?.split('@')[0] || '我'}
                </div>
                <div className="truncate text-[11px] text-slate-400">{user?.email}</div>
              </div>
              <button
                onClick={() => authApi.logout()}
                title="退出"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 顶栏（仅移动端显示汉堡） */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">学迹</span>
          </Link>
          <button
            onClick={() => authApi.logout()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            title="退出"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="md:ml-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-slate-400">
      <Sparkles className="mr-2 h-4 w-4 animate-pulse text-primary-500" />
      {label}
    </div>
  );
}
