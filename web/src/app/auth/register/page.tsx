'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/auth';
import { getErrorMessage } from '@/lib/api';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await authApi.register({
        email: email.trim(),
        password,
        nickname: nickname.trim() || undefined,
        invite_code: inviteCode.trim() || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary-600">学迹</h1>
        <p className="mt-1 text-sm text-gray-500">注册新账号</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
            家长昵称 <span className="text-xs text-gray-400">(可选)</span>
          </label>
          <input
            id="nickname"
            type="text"
            maxLength={64}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="默认取邮箱前缀"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">至少 8 位, 建议字母+数字</p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
            确认密码 <span className="text-red-500">*</span>
          </label>
          <input
            id="confirm"
            type={showPwd ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label htmlFor="invite" className="block text-sm font-medium text-gray-700">
            邀请码 <span className="text-xs text-gray-400">(开放注册可留空)</span>
          </label>
          <input
            id="invite"
            type="text"
            maxLength={32}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="向石头要"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-2.5 font-medium text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" />
          {loading ? '注册中…' : '注册'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        已有账号？
        <Link href="/auth/login" className="ml-1 font-medium text-primary-600 hover:underline">
          去登录
        </Link>
      </p>
    </main>
  );
}
