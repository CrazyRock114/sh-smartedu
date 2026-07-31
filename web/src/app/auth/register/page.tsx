'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { getErrorMessage } from '@/lib/api';
import { UserPlus, Eye, EyeOff, GraduationCap, Sparkles, Check, Gift } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL 预填邀请码, 朋友家点 /auth/register?code=lily-2026 不用手抄
  const urlCode = searchParams.get('code') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState(urlCode);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlCode) setInviteCode(urlCode);
  }, [urlCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }

    setLoading(true);
    try {
      const resp = await authApi.register({
        email: email.trim(),
        password,
        nickname: nickname.trim() || undefined,
        invite_code: inviteCode.trim() || undefined,
      });
      // 新用户 → 引导页, 老用户直接进 dashboard
      if (resp?.is_new_user) {
        router.push('/welcome?next=/dashboard');
      } else {
        router.push('/dashboard');
      }
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
              15 秒注册<br />
              立即开始
            </h1>
            <p className="text-lg text-primary-100">
              对接 basic.sh.smartedu.cn 官方免费微课，不重复造内容
            </p>
            <div className="space-y-2 text-sm text-primary-100">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />邮箱 + 密码就够, 不用绑手机
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />5 大模块, 满足学情 / 错题 / 图谱需求
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />公益项目, 不商业化, 不收费
              </div>
            </div>
          </div>

          <div className="text-xs text-primary-200">v0.2 · 自用 + 朋友圈公益项目</div>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-slate-900">学迹</div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">注册新账号</h2>
          <p className="mt-2 text-sm text-slate-500">邮箱 + 密码, 1 分钟搞定</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                邮箱 <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-slate-700">
                家长昵称 <span className="text-xs text-slate-400">(可选)</span>
              </label>
              <input
                id="nickname"
                type="text"
                maxLength={64}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="默认取邮箱前缀"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                密码 <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <p className="mt-1 text-xs text-slate-400">至少 8 位, 建议字母+数字</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
                确认密码 <span className="text-rose-500">*</span>
              </label>
              <input
                id="confirm"
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <label htmlFor="invite" className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                <Gift className="h-3.5 w-3.5" />
                邀请码 <span className="text-rose-500">*</span>
                <span className="text-xs font-normal text-amber-700">(必填, 朋友家限定)</span>
              </label>
              <input
                id="invite"
                type="text"
                required
                maxLength={32}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="lily-2026 / mike-2026 / wang-2026"
              />
              <p className="mt-1.5 text-[11px] text-amber-700">
                没邀请码请向石头要 · 3 户朋友家限定, 不对外开放
              </p>
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
              <UserPlus className="h-4 w-4" />
              {loading ? '注册中…' : '注册'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            已有账号？
            <Link
              href="/auth/login"
              className="ml-1 font-semibold text-primary-600 hover:text-primary-700"
            >
              去登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
