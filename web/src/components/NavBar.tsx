'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/auth';
import type { CurrentUser } from '@/lib/types';
import { LogOut, User } from 'lucide-react';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  // 不在 auth 页面 + 登录了 = 显示 Nav
  const isAuthPage = pathname?.startsWith('/auth');
  if (isAuthPage) return null;

  const navItems = [
    { href: '/dashboard', label: '学情' },
    { href: '/children', label: '孩子' },
    { href: '/errors', label: '错题' },
    { href: '/knowledge', label: '图谱' },
  ];

  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary-600">学迹</span>
          <span className="hidden text-xs text-gray-400 sm:inline">Xueji</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {authApi.isLoggedIn() ? (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    pathname?.startsWith(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3.5 w-3.5" />
                  {user?.nickname || user?.email?.split('@')[0] || '我'}
                </span>
                <button
                  onClick={() => authApi.logout()}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  title="退出"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-primary-500 px-3 py-1.5 text-white hover:bg-primary-600"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
