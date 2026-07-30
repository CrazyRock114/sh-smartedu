'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Moon,
  Clock,
  CheckCheck,
  Settings,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { authApi } from '@/lib/auth';
import { pushApi, type PushPreference, type PushRecord, type LockStatus } from '@/lib/push';
import { getErrorMessage } from '@/lib/api';

export default function PushPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<PushPreference | null>(null);
  const [records, setRecords] = useState<PushRecord[]>([]);
  const [lock, setLock] = useState<LockStatus | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      router.push('/auth/login?next=/push');
      return;
    }
    refresh();
  }, [router]);

  async function refresh() {
    setError(null);
    try {
      const [p, rs, ls] = await Promise.all([
        pushApi.getPreferences(),
        pushApi.listRecords(filter === 'unread'),
        pushApi.lockStatus(),
      ]);
      setPrefs(p);
      setRecords(rs);
      setLock(ls);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    refresh();
  }, [filter]);

  async function savePrefs(patch: Partial<PushPreference>) {
    if (!prefs) return;
    setSaving(true);
    try {
      const updated = await pushApi.updatePreferences(patch);
      setPrefs(updated);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await pushApi.markAllRead();
      refresh();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleMarkOne(id: string) {
    try {
      await pushApi.markRead(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (!prefs) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center text-gray-500">加载中…</div>
      </main>
    );
  }

  const unreadCount = records.filter((r) => !r.opened_at).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🔔 推送 + 锁屏</h1>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 锁屏状态条 */}
      {lock && lock.is_locked && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4">
          <Moon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold text-rose-800">夜深了, 暂时锁屏</p>
            <p className="mt-1 text-sm text-rose-700">{lock.lock_reason}</p>
          </div>
        </div>
      )}

      {/* 今日用量 */}
      {lock && (
        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">今日学习时长</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">
              {lock.used_minutes}
            </span>
            <span className="text-sm text-gray-500">/ {lock.limit_minutes} 分钟</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                lock.used_minutes > lock.limit_minutes
                  ? 'bg-rose-500'
                  : lock.used_minutes > lock.limit_minutes * 0.7
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((lock.used_minutes / lock.limit_minutes) * 100, 100)}%` }}
            />
          </div>
        </section>
      )}

      {/* 偏好设置 */}
      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">偏好设置</h2>
        </div>

        <div className="space-y-3 text-sm">
          <Toggle
            label="接收推送"
            description="录错题 / 掌握时, 站内通知会出现在下方"
            checked={prefs.push_enabled}
            onChange={(v) => savePrefs({ push_enabled: v })}
            disabled={saving}
          />

          <div>
            <label className="mb-1 block text-xs text-gray-500">推送时间</label>
            <input
              type="time"
              value={prefs.push_time}
              onChange={(e) => savePrefs({ push_time: e.target.value })}
              disabled={saving}
              className="rounded border-gray-300 px-2 py-1 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">每天定时提醒 (MVP 当前仅 in-app, 不发邮件)</p>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <Toggle
              label="夜间锁屏"
              description={`${prefs.lock_time} 后, 超出每日时长则拒绝学习类操作`}
              checked={prefs.lock_at_night}
              onChange={(v) => savePrefs({ lock_at_night: v })}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">每日学习上限 (分钟)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={prefs.daily_limit_minutes}
              onChange={(e) =>
                savePrefs({ daily_limit_minutes: parseInt(e.target.value, 10) || 30 })
              }
              disabled={saving}
              className="w-20 rounded border-gray-300 px-2 py-1 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">5-180 分钟, 默认 30</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">锁屏起始时间</label>
            <input
              type="time"
              value={prefs.lock_time}
              onChange={(e) => savePrefs({ lock_time: e.target.value })}
              disabled={saving}
              className="rounded border-gray-300 px-2 py-1 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">默认 21:00, 锁屏判断: 当前时间 ≥ 此值 且 超时长</p>
          </div>
        </div>
      </section>

      {/* 通知列表 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">站内通知</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                {unreadCount} 未读
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
              className="rounded border-gray-300 text-xs"
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
            </select>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <CheckCheck className="h-3 w-3" />
                全部已读
              </button>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {filter === 'unread' ? '没有未读通知' : '还没有通知'}
          </div>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li
                key={r.id}
                className={`flex items-start gap-2 rounded-lg border p-3 ${
                  r.opened_at
                    ? 'border-gray-100 bg-gray-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{r.content_summary}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(r.sent_at).toLocaleString('zh-CN')} ·{' '}
                    {r.push_type === 'alert' ? '提醒' : r.push_type}
                  </p>
                </div>
                {!r.opened_at && (
                  <button
                    onClick={() => handleMarkOne(r.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="标为已读"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
