'use client';

import { useEffect, useState } from 'react';
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
import { PageHeader, Loading } from '@/components/NavBar';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!prefs) return <Loading label="加载推送设置…" />;

  const unreadCount = records.filter((r) => !r.opened_at).length;

  return (
    <div>
      <PageHeader
        icon={<Bell className="h-5 w-5" />}
        title="推送 + 锁屏"
        subtitle="自动提醒 + 21 点锁屏保护眼睛"
      />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 锁屏状态条 */}
      {lock && lock.is_locked && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4">
          <Moon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold text-rose-800">夜深了, 暂时锁屏</p>
            <p className="mt-1 text-sm text-rose-700">{lock.lock_reason}</p>
          </div>
        </div>
      )}

      {/* 今日用量 */}
      {lock && (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">今日学习时长</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{lock.used_minutes}</span>
            <span className="text-sm text-slate-500">/ {lock.limit_minutes} 分钟</span>
            {lock.is_locked && (
              <span className="ml-auto rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                已锁
              </span>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
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
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">偏好设置</h2>
          {saving && <span className="text-xs text-slate-400">保存中…</span>}
        </div>

        <div className="space-y-4 text-sm">
          <Toggle
            label="接收推送"
            description="录错题 / 掌握时, 站内通知会出现在下方"
            checked={prefs.push_enabled}
            onChange={(v) => savePrefs({ push_enabled: v })}
            disabled={saving}
          />

          <div>
            <label className="mb-1.5 block text-xs text-slate-500">推送时间</label>
            <input
              type="time"
              value={prefs.push_time}
              onChange={(e) => savePrefs({ push_time: e.target.value })}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <p className="mt-1 text-xs text-slate-400">每天定时提醒 (v0.2 当前仅 in-app, 不发邮件)</p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <Toggle
              label="夜间锁屏"
              description={`${prefs.lock_time} 后, 超出每日时长则拒绝学习类操作`}
              checked={prefs.lock_at_night}
              onChange={(v) => savePrefs({ lock_at_night: v })}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-500">每日学习上限 (分钟)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={prefs.daily_limit_minutes}
              onChange={(e) =>
                savePrefs({ daily_limit_minutes: parseInt(e.target.value, 10) || 30 })
              }
              disabled={saving}
              className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <p className="mt-1 text-xs text-slate-400">5-180 分钟, 默认 30</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-500">锁屏起始时间</label>
            <input
              type="time"
              value={prefs.lock_time}
              onChange={(e) => savePrefs({ lock_time: e.target.value })}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <p className="mt-1 text-xs text-slate-400">默认 21:00, 锁屏判断: 当前时间 ≥ 此值 且 超时长</p>
          </div>
        </div>
      </section>

      {/* 通知列表 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">站内通知</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-medium text-white">
                {unreadCount} 未读
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-primary-400"
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
            </select>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <CheckCheck className="h-3 w-3" />
                全部已读
              </button>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {filter === 'unread' ? '没有未读通知' : '还没有通知'}
          </div>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li
                key={r.id}
                className={`flex items-start gap-2 rounded-xl border p-3 transition ${
                  r.opened_at ? 'border-slate-100 bg-slate-50' : 'border-primary-200 bg-primary-50'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{r.content_summary}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.sent_at).toLocaleString('zh-CN')} ·{' '}
                    {r.push_type === 'alert' ? '提醒' : r.push_type}
                  </p>
                </div>
                {!r.opened_at && (
                  <button
                    onClick={() => handleMarkOne(r.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
    </div>
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
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? 'bg-primary-600' : 'bg-slate-300'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
