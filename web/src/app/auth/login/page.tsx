'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { getErrorMessage } from '@/lib/api';
import { LogIn, Eye, EyeOff, GraduationCap, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.login({ email: email.trim(), password });
      router.push(next);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 左侧品牌 */}
      <div className="relative hidden w-0 flex-1 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 lg:flex lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-300 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold">学迹 · Xueji</div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              把孩子的错题、<br />
              知识地图、学习节奏<br />
              连成一张清晰的网
            </h1>
            <p className="text-lg text-primary-100">
              对接 basic.sh.smartedu.cn 官方免费微课，不重复造内容，不做校外培训
            </p>
            <div className="space-y-2 text-sm text-primary-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />5 大模块: 教材同步 / 学情 / 错题本 / 知识图谱 / 推送
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />不拍照给答案 (教育部 2021 禁令)
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />公益项目, 不商业化
              </div>
            </div>
          </div>

          <div className="text-xs text-primary-200">v0.2 · 自用 + 朋友圈公益项目</div>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-slate-900">学迹</div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">登录继续</h2>
          <p className="mt-2 text-sm text-slate-500">邮箱 + 密码就够了</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                密码
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            还没账号？
            <Link
              href="/auth/register"
              className="ml-1 font-semibold text-primary-600 hover:text-primary-700"
            >
              注册一个
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
