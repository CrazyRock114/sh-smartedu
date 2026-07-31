'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Share2, MessageCircle, Mail, Key, ArrowRight, Gift, Heart } from 'lucide-react';
import { PageHeader } from '@/components/NavBar';

const INVITE_CODES = [
  { code: 'lily-2026', label: 'Lily 家', emoji: '🌸' },
  { code: 'mike-2026', label: 'Mike 家', emoji: '🚀' },
  { code: 'wang-2026', label: 'Wang 家', emoji: '🐼' },
];

export default function FriendsGuidePage() {
  const [copied, setCopied] = useState<string | null>(null);

  // 用 window.location.host 拼当前公网 URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pale-acquisitions-relax-intro.trycloudflare.com';
  const registerUrl = `${baseUrl}/auth/register`;

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 降级: 选中文本
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const fullMessage = (code: string) =>
    `我给你开通了「学迹 Xueji」账号（上海小学生学习辅助，对接官方空中课堂），\n` +
    `注册链接: ${registerUrl}\n` +
    `邀请码: ${code}\n` +
    `注册后就能看到孩子的本周微课、录错题、自动安排复习。\n` +
    `（自用 + 朋友家公益项目，不收费、不做校外培训、不拍照给答案）`;

  return (
    <div className="max-w-2xl">
      <PageHeader
        icon={<Gift className="h-5 w-5" />}
        title="邀请朋友家"
        subtitle="3 户朋友家的邀请码 + 注册链接, 直接微信发出去"
      />

      {/* 1 步直达: 公网链接 */}
      <section className="mb-4 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-emerald-50 p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-emerald-600 text-white shadow-sm">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">公网链接</h2>
            <p className="text-xs text-slate-500">复制给朋友, 朋友在手机/电脑浏览器打开</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <code className="flex-1 truncate text-xs text-slate-700">{registerUrl}</code>
          <button
            onClick={() => copyText(registerUrl, 'url')}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            {copied === 'url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied === 'url' ? '已复制' : '复制'}
          </button>
        </div>
      </section>

      {/* 2 邀请码 (3 户朋友) */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800">3 户朋友的邀请码</h2>
          <span className="text-xs text-slate-400">（一人一个, 朋友注册时填）</span>
        </div>
        <div className="space-y-2">
          {INVITE_CODES.map((c) => (
            <div
              key={c.code}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5"
            >
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                <code className="font-mono text-xs text-amber-700">{c.code}</code>
              </div>
              <button
                onClick={() => copyText(c.code, c.code)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:border-primary-300 hover:text-primary-700"
              >
                {copied === c.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === c.code ? '已复制' : '复制'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3 微信话术 (一键复制) */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <h2 className="text-base font-semibold text-slate-800">发给朋友的话术 (按户选码)</h2>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          点下面 "复制话术" → 微信粘贴 → 朋友点链接 + 填邀请码注册。
        </p>
        <div className="space-y-2">
          {INVITE_CODES.map((c) => (
            <div key={c.code + '-msg'} className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {c.emoji} {c.label} · 邀请码 {c.code}
                </span>
                <button
                  onClick={() => copyText(fullMessage(c.code), c.code + '-msg')}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {copied === c.code + '-msg' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === c.code + '-msg' ? '已复制' : '复制话术'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                {fullMessage(c.code)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* 4 朋友家 30 秒上手流程 */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800">朋友家 30 秒上手</h2>
        <ol className="space-y-2.5 text-sm text-slate-700">
          <li className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">1</span>
            <span>点链接打开 → 邮箱注册 → 填邀请码（3 选 1）</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">2</span>
            <span>添加孩子（年级 + 学科 + 教材版本）</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">3</span>
            <span>首页选年级 → 教材同步 → 看本周微课（新窗口跳到 basic.sh.smartedu.cn 官方播放器）</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">4</span>
            <span>Dashboard 看今日待办（待复习 + 今日 2 集微课）</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">5</span>
            <span>错题 → 录错题 → 拍照 OCR（需配 GLM key, 未配可手动）→ 自动排复习</span>
          </li>
        </ol>
      </section>

      {/* 5 不做什么 (避免朋友误会) */}
      <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
          <Heart className="h-3.5 w-3.5" />
          自用 + 朋友家公益项目
        </div>
        <p>
          ✅ 对接 basic.sh.smartedu.cn 官方免费微课<br />
          ❌ 不收费 · 不做校外培训 · 不拍照给答案 · 不做 AI 讲题 · 不社交/打卡/排名
        </p>
      </section>

      <div className="flex gap-2">
        <Link
          href="/dashboard"
          className="flex-1 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
        >
          回 Dashboard
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
